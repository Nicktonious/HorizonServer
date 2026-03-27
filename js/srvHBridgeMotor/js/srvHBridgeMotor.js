const { EventEmitter2 } = require("eventemitter2");
// const ClassBaseService = require('../../srvService/js/srvService.js');
const ClassBaseService = require('./srvService.js');
const mqtt = require('mqtt');
const PROTOCOL = 'mhbridge';
const PRIMARY_BUS = 'mhbridgeBus';
const BUS_NAME_LIST = ['sysBus', 'logBus', PRIMARY_BUS, 'modBusBus'];
const MHBRIDGE = 'mhbridge';
const PROXY = 'proxymhbridge';
const NAME = 'mhbridge';

const KEY_ON = 1;
const KEY_OFF = 0;

class ClassModBusHBridge_S extends ClassBaseService {

    #_BridgeCtrl = {};
    #_Opts = {};

    constructor({ _busList }) {
        super({ _name: NAME, _busNameList: BUS_NAME_LIST, _busList });

        this.FillEventOnList('sysBus', ['all-init-stage1-set']);
        this.FillEventOnList(PRIMARY_BUS, ['mhbridge-cmd']);
    }
    /**
     * @returns {KC868}
     */
    get BridgeCtrl() {
        return this.#_BridgeCtrl;
    }

    *Sources() {
        for (let source of Object.values(this.SourcesState)) {
            if (source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
                yield source;
        };
    }

    async HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);
    
        let mqttSource = Object.values(this.SourcesState).find(s => s.Protocol == 'mqtt');
        this.mqttC = (await this.#CreateMQTTConnection(mqttSource)).client;

        for (let source of this.Sources()) {
            this.#_Opts[source.Name] = source.AdvOpts;
            // let source = Object.values(this.SourcesState).find(_source => _source.Protocol === PROTOCOL);

            this.#_BridgeCtrl[source.Name] = new KC868({ mbID: source.AdvOpts.source }, this.mqttC);
        }
    }

    #CreateMQTTConnection(_source) {
        return new Promise(async (res, rej) => {
            let options = Object.assign({
                port:     _source.Port,
                username: _source.Login,
                password: _source.Password,
            }, _source.ConnectOpts);
            options.protocol ??= 'mqtt'; //по умолчанию mqtt://

            let url = `${options.protocol}://${(_source.IP) ? _source.IP : _source.DN}`;

            try {
                const connection = await mqtt.connectAsync(url, options);
                res({ source: _source, client: connection });
            } catch (e) {
                this.EmitEvents_logger_log({ msg: `Error trying connect to ${url}`, level: 'E', obj: e });
                res({ source: _source, client: null });
            }
        });
    }
    async HandlerEvents_mhbridge_cmd(_topic, msg) {
        const { hash } = msg.metadata;
        const [ sourceName ] = msg.arg;
        const [{ cmd, args, value }] = msg.value;

        let error = false;

        try {
            switch (cmd) {
                case 'Forward':
                    await this.Forward(sourceName, ...args)
                    break;
                case 'Reverse':
                    await this.Reverse(sourceName, ...args);
                    break;
                case 'Off':
                    await this.Stop(sourceName, ...args);
                    break;
            }
        } catch (e) {
            error = true;
        }

        let resArg = [sourceName];
        let resValue = { ...msg.value[0], error };
        this.EmitEvents_proxymhbridge_res({ hash, arg: resArg, value: [resValue] });
    }

    EmitEvents_proxymhbridge_res({ hash, arg, value }) {
        const msg = {
            // hash,
            dest: PROXY,
            com: 'proxymhbridge-res',
            arg,
            value,
        };
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
    }

    async Forward(_sourceName, opts) {
        let { step = undefined } = opts;

        const { s1, s3, s2, s4 } = this.#_Opts[_sourceName].keys;
        let io = this.#_BridgeCtrl[_sourceName];

        switch (step) {


            case 1: // отключаем ключи в верхнем плече
                await this.Switch(io, s1, KEY_OFF);
                await this.Switch(io, s2, KEY_OFF);
                break;

            case 2: // включаем рабочую диагональ
                await this.Switch(io, s1, KEY_ON);
                await this.Switch(io, s4, KEY_ON);
                break;

            default:
                throw new Error('Invalid step');
        }
    }

    async Reverse(_sourceName, { step }) {

        const { s1, s3, s2, s4 } = this.#_Opts[_sourceName].keys;
        let io = this.#_BridgeCtrl[_sourceName];

        switch (step) {

            case 1:
                await this.Switch(io, s3, KEY_OFF);
                await this.Switch(io, s4, KEY_OFF);
                break;

            case 2:
                await this.Switch(io, s3, KEY_ON);
                await this.Switch(io, s2, KEY_ON);
                break;

            default:
                throw new Error('Invalid step');
        }
    }

    async Stop(_sourceName, opts) {
        let { step = undefined } = opts;

        const { s1, s3, s2, s4 } = this.#_Opts[_sourceName].keys;
        let io = this.#_BridgeCtrl[_sourceName];

        switch (step) {
            case undefined: {
                await this.Switch(io, s1, KEY_OFF);
                await this.Switch(io, s2, KEY_OFF);
                await this.Switch(io, s3, KEY_OFF);
                await this.Switch(io, s4, KEY_OFF);
            }

            case 1:
                await this.Switch(io, s1, KEY_OFF);
                await this.Switch(io, s2, KEY_OFF);
                break;

            case 2:
                await this.Switch(io, s3, KEY_OFF);
                await this.Switch(io, s4, KEY_OFF);
                break;

            default:
                throw new Error('Invalid step');
        }
    }

    /**
     * 
     * @param {KC868} io 
     * @param {number} chNum 
     * @param {number} value 
     */
    async Switch(io, chNum, value) {

        io.SetValue(chNum, value);

        await io.Events.waitFor(`${chNum}-value`, {
            timeout: 100,// TODO: LIFT_CONSTANTS.MOTOR_RES_MAX_TIME,
            filter: (v) => v === value
        }).catch(() => {
            throw new Error(`HBridge channel ${chNum} no response`);
        });

        /*if (this.#_Opts.safeSwitchDelay)
            await new Promise(r => setTimeout(r, this.#_Opts.safeSwitchDelay));*/
    }
}

class KC868 {
    Events = new EventEmitter2()
    /**
     * 
     * @param {MatrixCtrlGroupConfig} opts 
     * @param {mqtt.MqttClient} mqttC 
     */
    constructor(opts, mqttC) {
        this.addr = opts.mbID;
        this.mqttC = mqttC;
    }
    SetValue(chNum, value) {
        setTimeout(() => {
            try {
                this.mqttC.publishAsync(`/Emulator/KC868/${this.addr}/${chNum}`, typeof value == 'string' ? value : JSON.stringify(value));
            } catch (e) {}
            this.OnSetValue(chNum, value);
            this.Events.emit(`${chNum}-value`, value);
        }, 0);
    }
    OnSetValue(chNum, value) {

    }
}

module.exports = ClassModBusHBridge_S;
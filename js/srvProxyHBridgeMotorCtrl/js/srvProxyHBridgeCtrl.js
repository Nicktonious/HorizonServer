const ClassBaseService_S = require('./../../srvService/js/srvService');
const THIS_NAME = 'proxymhbridge';
const COM_ALL_DATA_RAW_GET = 'all-data-raw-get';
const COM_ALL_DATA_FINE_GET = 'all-data-fine-get';
const COM_ALL_DATA_FINE_SET = 'all-data-fine-set';
const COM_ALL_ACTUATOR_SET = 'all-actuator-set';
const PROTOCOL = 'mhbridge';
const CLIENT_NAME = 'mhbridge';

const EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect'];
const EVENT_PRIMBUS_LIST = ['proxymhbridge-send', 'proxymhbridge-res', 'proxymhbridge-cmd', COM_ALL_DATA_RAW_GET];
// const BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus'];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'mhbridgeBus', 'dataBus'];

class ClassProxyModBusHBridgeMotor_S extends ClassBaseService_S {
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _primaryBus, _node }) {
        super({ _name: THIS_NAME, _busNameList: [_primaryBus, ...BUS_NAMES_LIST], _busList, _node });
        this.PrimaryBus = _primaryBus;
        /** @type {Map<string, import("./srvHBridgeMotor.js").IHBridgeConfig>} */
        this._SourcesOpts = new Map();
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(_primaryBus, EVENT_PRIMBUS_LIST);
        this.FillEventOnList('dataBus', [COM_ALL_DATA_FINE_SET]);
        this.EmitEvents_logger_log({ level: 'I', msg: 'ProxyModbusHBridgeMotor initialized.' });
    }

    get HostSrvName() { 
        const hostSrvName = this.ServicesState[CLIENT_NAME]?.AdvancedOptions?.host;
        return hostSrvName ? `proxy${hostSrvName}` : undefined;
    }

    *Channels(sourceName) {
        for (const service of Object.values(this.ServicesState)) {
            if (service.AdvancedOptions?.SourceName == sourceName && service.BusList?.includes?.(this.PrimaryBus))
                yield service;
        }
    }

    *Sources() {
        for (let source of Object.values(this.SourcesState)) {
            if (source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
                yield source;
        };
    }

    GetSourceByChName(chName) {
        for (const [sourceName, { channels }] of this._SourcesOpts.entries()) {
            if (channels?.includes?.(chName))
                return sourceName;
        }
    }

    async HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        for (let source of this.Sources()) {
            this._SourcesOpts.set(source.Name, source.AdvOpts);
        }
    }
    /**
     * @method
     * @public
     * @description Отправляет службе mhbridge топик и значение, которое требуется записать
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymhbridge_send(_topic, _msg) {
        let { arg, value } = _msg;
        let [cmd] = value[0].value;
        const chName = _msg.metadata.source;
        const sourceName = chName ? this.ServicesState[chName]?.Service?.SourceName : undefined;
        // const [{ cmd, args, value }] = cmd;

        if (sourceName != undefined) {
            this.EmitEvents_mhbridge_cmd(sourceName, cmd);
        }
    }
    /**
     * @method 
     * @param {string} _topic - команда
     * @param {ClassBusMsg_S} _msg - сообщение
     */
    HandlerEvents_proxymhbridge_res(_topic, _msg) {
        const source_name = _msg.arg[0];
        const ch_name = Object.values(this.ServicesState).find(obj => obj.Service?.SourceName == source_name)?.Name;
        if (!ch_name) {
            this.EmitEvents_logger_log({ level: 'E', msg: `Received msg from ${CLIENT_NAME} but no channel found for source ${source_name}.` });
            return
        }
        const value = _msg.value[0];

        this.EmitEvents_all_data_raw_get(source_name, ch_name, value);
    }

    HandlerEvents_proxymhbridge_cmd(_topic, _msg) {
        const src = _msg.metadata.source;
        if (src != CLIENT_NAME) return;

        const sourceName = _msg.arg[0];
        const chNum = _msg.value[0].arg[0];
        const value = _msg.value[0].value[0];
        const chName = this._SourcesOpts.get(sourceName)?.channels?.[chNum];
        if (!chName) return;
        this.EmitEvents_all_actuator_set(chName, value);
        this.EmitEvents_all_data_fine_get(chName);
    }

    HandlerEvents_all_data_fine_set(_topic, _msg) {
        try {
            const chName = _msg.arg[0];
            const sourceName = this.GetSourceByChName(chName);
            if (!sourceName) return;
            const { Value } = _msg.value[0]; 
            const chNum = this._SourcesOpts.get(sourceName)?.channels?.indexOf(chName);
            if (chNum > -1)
                this.EmitEvents_mhbridge_ch_set(sourceName, chNum, Value);   
        } catch (e) {
            this.EmitEvents_logger_log({ msg: `Error while processing data-fine msg`, level: 'E', obj: _msg });}
    }
    /**
     * @method
     * @public
     * @description Отправляет на mhbridge запрос на отправку команды
     * @param {*} param0 
     */
    EmitEvents_mhbridge_cmd(sourceName, cmd) {
        const msg = {
            dest: CLIENT_NAME,
            com: `${CLIENT_NAME}-cmd`,
            arg: [sourceName],
            value: [cmd]
        }
        this.EmitMsg(this.PrimaryBus, msg.com, msg);
    }

    EmitEvents_mhbridge_ch_set(sourceName, chNum, value) {
        const msg = {
            dest: CLIENT_NAME,
            com: `${CLIENT_NAME}-ch-set`,
            arg: [sourceName],
            value: [{
                arg: [chNum],
                value: [value]
            }]
        }
        this.EmitMsg(this.PrimaryBus, msg.com, msg);
    }

    /**
     * Обновляет Value ctrl-канала драйвера
     * @param {string} source_name 
     * @param {string} ch_name 
     * @param {any} value 
     * @returns 
     */
    EmitEvents_all_data_raw_get(source_name, ch_name, value) {
        if (!(source_name && ch_name)) return;
        const msg = {
            dest: ch_name,
            com: COM_ALL_DATA_RAW_GET,
            arg: [source_name],
            value: [{
                com: COM_ALL_DATA_RAW_GET,
                arg: [ch_name],
                value: [value]
            }]
        }
        this.EmitMsg(this.PrimaryBus, msg.com, msg);
    }

    /**
     * Запроашивает Value у канала
     * @param {string} ch_name 
     * @returns 
     */
    EmitEvents_all_data_fine_get(ch_name) {
        if (!ch_name) return;
        const msg = {
            dest: ch_name,
            com: COM_ALL_DATA_FINE_GET,
            arg: [ch_name],
            value: []
        }
        this.EmitMsg('dataBus', msg.com, msg);
    }

    /**
     * @method 
     * @description Отправка команды актуатору
     * @param {string} chName 
     * @param {any} value 
     */
    EmitEvents_all_actuator_set(chName, value) {
        const msg = {
            dest: chName,
            com: COM_ALL_ACTUATOR_SET,
            arg: [chName],
            value: [value]
        }
        this.EmitMsg('dataBus', msg.com, msg);
    }
}

module.exports = ClassProxyModBusHBridgeMotor_S;
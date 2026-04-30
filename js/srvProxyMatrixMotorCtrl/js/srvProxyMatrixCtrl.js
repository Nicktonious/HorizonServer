const ClassBaseService_S = require('../../srvService/js/srvService.js');

const THIS_NAME = 'proxymmtrxmotor';
const COM_ALL_DATA_RAW_GET = 'all-data-raw-get';
const PRIMARY_BUS = 'mmtrxmotorBus';
const PROTOCOL = 'mmtrxmotor';
const CLIENT = 'mmtrxmotor';

const EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect'];
const EVENT_MODBUS_LIST = ['proxymmtrxmotor-send', 'proxymmtrxmotor-res'];
const BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus'];

class ClassProxyModBusMatrixMotor_S extends ClassBaseService_S {
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(PRIMARY_BUS, EVENT_MODBUS_LIST);
        this.EmitEvents_logger_log({ level: 'I', msg: 'ProxyModbusMatrixMotor initialized.' });
    }

    HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);
    
        Object.values(this.SourcesState)
            .filter(_source => _source.Protocol === PRIMARY_BUS)
            .forEach(_source => {
                _source.CheckProxy = true;
                _source.PrimaryBus = PRIMARY_BUS;
            });
    }
    /**
     * @typedef TypeSourceDesc
     * @property {string} SourceName
     * @property {number} ChNum
     * @property {string} Name 
     */
    /**
     * 
     * @param {*} _topic 
     * @param {*} _msg 
     * @returns {Iterable.<TypeSourceDesc>}
     */
    *Sources(_topic, _msg) {
        for (const source of Object.values(this.SourcesState)) {
            if (source.Protocol !== PROTOCOL) continue;
            for (const channel of Object.values(this.ServicesState)) {
                if (channel.AdvancedOptions &&
                    channel.AdvancedOptions.SourceName === source.Name) {
                    yield {
                        SourceName: source.Name,
                        ChNum: channel.AdvancedOptions.ChNum,
                        Name: channel.Name
                    };
                }
            }
        }
    }
    /**
     * @method
     * @public
     * @description Отправляет службе modbusclientled топик и значение, которое требуется записать
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymmtrxmotor_send(_topic, _msg) {
        let { arg, value } = _msg;
        let cmd = value[0].value;
        const chName = _msg.metadata.source;
        const sourceName = chName ? this.ServicesState[chName]?.Service?.SourceName : undefined;

        if (sourceName != undefined) {
            this.EmitEvents_mmtrxmotor_cmd({ arg: [sourceName], value: cmd });
        }

        // const source_name = _msg.metadata.source;
        // const source = [...this.Sources()].find(_obj => _obj.Name === source_name);
    }
    /**
     * @method 
     * @description Вызывается при обработке события 'proxywsc_msg_get', который инициируется WSC
     * @param {string} _topic - команда
     * @param {ClassBusMsg_S} _msg - сообщение
     */
    HandlerEvents_proxymmtrxmotor_res(_topic, _msg) {
        const source_name = _msg.arg[0];
        const ch_name = Object.values(this.ServicesState).find(obj => obj.Service?.SourceName == source_name)?.Name;
        if (!ch_name) {
            this.EmitEvents_logger_log({ level: 'E', msg: `Received msg from ${CLIENT} but no channel found for source ${source_name}.` });
            return
        }
        const msg = {
            dest: ch_name,
            com: COM_ALL_DATA_RAW_GET,
            arg: [source_name],
            value: [{
                com: COM_ALL_DATA_RAW_GET,
                arg: [ch_name],
                value: [_msg.value[0]]
            }]
        }
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
    }
    /**
     * @method
     * @public
     * @description Отправляет на MQTT Client запрос на отправку сообщения на брокер
     * @param {*} param0 
     */
    EmitEvents_mmtrxmotor_cmd({ arg, value }) {
        const msg = {
            dest: CLIENT,
            com: 'mmtrxmotor-cmd',
            arg,
            value
        }
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
    }
}

module.exports = ClassProxyModBusMatrixMotor_S;
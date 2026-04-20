const ClassBaseService_S = require('srvService');

const THIS_NAME = 'proxymodbusnls';
const COM_ALL_DATA_RAW_GET = 'all-data-raw-get';
const PRIMARY_BUS = 'modbusnlsBus';
const PROTOCOL = 'mbnls';

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect'];
EVENT_MODBUS_LIST = ['proxymodbusnls-send', 'proxymodbusnls-msg-get'];
BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus'];

class ProxyRLNLS extends ClassBaseService_S {
    #_SourceMapNames;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.#_SourceMapNames = [];
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(PRIMARY_BUS, EVENT_MODBUS_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'ProxyModbusNLS initialized.'});
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
    HandlerEvents_test_connect(_topic, _msg) {
         Object.values(this.SourcesState)
            .filter(_source => _source.Protocol === PROTOCOL)  
            .forEach(_source =>{
                Object.values(this.ServicesState)
                    .filter(_channel => _channel.AdvancedOptions && _channel.AdvancedOptions.SourceName === _source.Name)
                    .forEach(_channel => {
                        this.#_SourceMapNames.push({source: _source.Name, chNum: _channel.AdvancedOptions.ChNum, Name: _channel.Name});
                });
            });
    }
    /**
     * @method
     * @public
     * @description Отправляет службе modbusclientled топик и значение, которое требуется записать
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymodbusnls_send(_topic, _msg) {
        const source_name = _msg.metadata.source;
        const source = this.#_SourceMapNames.find(_obj => _obj.Name === source_name);

        if (source != undefined) {
            this.EmitEvents_modbusclientnls_send({ arg: [source.source, source.chNum], value: [_msg.value[0]]});
        }
    }
    /**
     * @method 
     * @description Вызывается при обработке события 'proxywsc_msg_get', который инициируется WSC
     * @param {string} _topic - команда
     * @param {ClassBusMsg_S} _msg - сообщение
     */
    HandlerEvents_proxymodbusnls_msg_get(_topic, _msg) {
        // извлечение "ядра" сообщения, составленного службой контроллера
        // LHP.Unpack
        //const msg_from_plc = JSON.parse(_msg.value[0] ?? '');
        //const [ source_name ] = _msg.arg;
        //const hash = this.#GetMsgHash(msg_from_plc.com, source_name);
        const source_name = _msg.arg[0];
        const ch_name = this.#_SourceMapNames.find(obj => obj.chNum == _msg.arg[1] && obj.source == source_name).Name;

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
        //console.log(ch_name + ': ' + _msg.value[0]);
    }
    /**
     * @method
     * @public
     * @description Отправляет на MQTT Client запрос на отправку сообщения на брокер
     * @param {*} param0 
     */
    EmitEvents_modbusclientnls_send({ arg, value }) {
        const msg = {
            dest: 'modbusNLS',
            com: 'modbusclientnls-send',
            arg,
            value
        }
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
    }
}

module.exports = ProxyRLNLS;
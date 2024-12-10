const ClassBaseService_S = require('srvService');
const ClassGlog2 = require('graylog2');

const EVENT_SYSBUS_LIST = ['all-init-stage1-set'];
const EVENT_LOGBUS_LIST = ['logger-log'];
const EVENT_MDBBUS_LIST = [''];
const EVENT_DATABUS_LIST = [''];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'mdbBus', 'dataBus'];
/**
 * @class
 * Класс предоставляет инструменты для логирования 
 */
class ClassLogger extends ClassBaseService_S {
    #_WriteToConsole;
    #_SourcesState;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }, options) {
        super({ _name: 'logger', _busNameList: BUS_NAMES_LIST, _busList, _node });
        this._gl = new ClassGlog2.graylog({
            servers: [
                { 'host': options.host || '127.0.0.1', 'port': options.port || 5141 }
            ],
            hostname: options.hostname || 'ap01',       // the name of this host
            facility: options.facility || 'HorizonServer', // the facility for these log messages
            bufferSize: 1350         // max UDP packet size, should never exceed the
        }); // объект взаимодействия с грейлогом, должен быть создан при ините, затем используется его метод для записи в грейлог
        this._WriteToConsole = options.console || false;
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('logBus', EVENT_LOGBUS_LIST);

        this.EmitEvents_logger_log({level: 'INFO', msg: 'Logger initialized.', obj: this._gl.config});
    }
    /*async HandlerEvents_all_init1(_topic, _msg) {
        super.HandlerEvents_all_init1(_topic, _msg);
        const { SourcesState } = _msg.arg[0];
        this.#_SourcesState = SourcesState;
    }*/
    set _WriteToConsole (opt) {
        if (typeof opt === 'boolean') {
            this.#_WriteToConsole = opt;
        }
    }
    /**
     * @method
     * @description
     * Возвращает строку с датой и временем в установленном формате
     * @returns datetime        - строка с датой и временем         
     */
    GetSystemTime() {
        let date = new Date(); 
        let datetime = (date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).substr(-2) +
        "-" + ("0" + date.getDate()).substr(-2) + " " + ("0" + date.getHours()).substr(-2) +
        ":" + ("0" + date.getMinutes()).substr(-2) + ":" + ("0" + date.getSeconds()).substr(-2));

        return datetime;
    }
    Capitalize(_str) {
        const str = _str.toLowerCase();
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    /**
     * @method
     * @description
     * Записывает сообщение в БД и выводит её в консоль
     * @param {Object} _msg      - Объект сообщения, содержащий необходимые данные от источника для передачи в Грейлог
     */
    HandlerEvents_logger_log(_topic, _msg) {
        let flevel = -1;
        let fdesc = 'Unknown';
        const logdesc = ['Critical', 'Error', 'Warning', 'Notice', 'Info', 'Debug'];
        const level = logdesc.indexOf(logdesc.find((lvl) => lvl.startsWith(this.Capitalize(_msg.arg[0]))));
        if (level != -1) {
            fdesc = logdesc[level];
            flevel = level+2;
        }
        const msg = _msg.value[0] || 'NoMessage';
        const obj = _msg.value[1] || {};
        const source = _msg.metadata.source;

        // Запись в грейлог
        this._gl._log(`${msg}`, obj, {level_desc: fdesc, service: source, service_bus: 'logBus'}, 0.0, flevel);
        if (this.#_WriteToConsole) {
            console.log(`${this.GetSystemTime()} [${source}.${'logBus'}] -> ${fdesc} | ${msg}`);
        }
    }
}
module.exports = ClassLogger;
const ClassBaseService_S = require('srvService');

const ClassProviderDB_S = require('srvProviderMDB');
const ClassLogger_S = require('srvLogger');
const ClassDeviceManager_S = require('srvDeviceManager');

let arr4 = require('Channels');

const SYSREQ_LIST = {
    'logger': ClassLogger_S, 
    'providermdb': ClassProviderDB_S, 
    'dm': ClassDeviceManager_S
};

const SERV_REQ_LIST = {
    'proxywsclient': 'srvProxyWS',
    'wsclient': 'srvWSClient',
    'proxymqttclient': 'srvProxyMQTT',
    'mqttclient': 'srvMQTTClient',
    'proxyrpiclient': 'srvProxyRpi',
    'rpiclient': 'srvRpiClient',
    'proxymqttgw': 'srvProxyMQTTGateway',
    'mqttgw': 'srvMQTTGateway',
    'sensor': 'srvChannelSensor',
    'actuator': 'srvChannelActuator'
};

const SYSSREVICES_LIST = [
    {
        Name: 'process',
        Importance: 'primary',
        Status: 'stopped',
        Protocol: 'sys',
        PrimaryBus: 'sysBus'
    },
    {
        Name: 'logger',
        Importance: 'primary',
        Status: 'stopped',
        Protocol: 'sys',
        PrimaryBus: 'logBus'
    },
    {
        Name: 'providermdb',
        Importance: 'primary',
        Status: 'stopped',
        Protocol: 'sys',
        PrimaryBus: 'mdbBus'
    },
    {
        Name: 'dm',
        Importance: 'primary',
        Status: 'stopped',
        Protocol: 'sys',
        PrimaryBus: 'dataBus'
    }
]

/**
 * @constant
 * Таймаут проверки Process запущенных служб
 */
const PROCESS_CHECK_TIMEOUT = 2000;
/**
 * @constant
 * Таймаут перед тем, как Process возбудит событие register
 */
const PROCESS_BUS_TIMEOUT = 1000;
const PROCESS_DB_TIMEOUT = 5000;

const EVENT_SYSBUS_LIST = ['all-init-stage1-set','process-ws-connect-done'];
const EVENT_MDBBUS_LIST = ['providermdb-init-stage0-get'];

const BUS_NAMES_LIST = ['sysBus', 'logBus', 'mdbBus', 'dataBus'];
const LHPSERVICES_LIST = ['proxywsclient', 'wsclient'];
const MQTTSERVICES_LIST = ['proxymqttclient', 'mqttclient'];
const RPISERVICES_LIST = ['proxyrpiclient', 'rpiclient'];

const PROCESS_NAME = 'process';

/**
 * @class
 * @description
 * Класс реализует функционал Process - службы, отвечающий за мониторинг запуска фреймворка,
 * создания шин и служебных контейнеров
 */
class ClassProcessSrv extends ClassBaseService_S {
    #_SourcesState;
    #_ServicesState;
    #_GBusList;
    #_Node;
    #_TimeOut;

    #_TestInterval;

    /**
     * @constructor
     * Конструктор класса
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: PROCESS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.#_GBusList = _busList;
        this.#_Node = _node;
        this.#_SourcesState = {};
        this.#_ServicesState = {};
        this.Init();
    }
    /**
     * @method
     * @description
     * Инициализирует работу Process. Создаёт объект, создаёт критически
     * необходимые шины и подписывает на необходимые события
     */
    Init() {
        BUS_NAMES_LIST.forEach((element) => {
            this.CreateBus(element);
        });
        this.UpdateBusList();
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('mdbBus', EVENT_MDBBUS_LIST);
        SYSSREVICES_LIST.forEach((sysservice) => {
            try {
                const servName = sysservice.Name;
                this.#_ServicesState[servName] = sysservice;
                if (servName === 'process') {
                    this.#_ServicesState[servName].Service = this;
                }
                else
                    this.#_ServicesState[servName].Service = new SYSREQ_LIST[servName]({_busList: this.#_GBusList, _node: this.#_Node},{port: 5142, console: true});
            }
            catch (e) {
                sysservice.ErrorMsg = e.toString();
                this.EmitEvents_logger_log({level: 'E', msg: `Failed to initialize primary service ${sysservice.Name}.`, obj: sysservice});
            }
        })

        this.EmitEvents_process_init0();
        this.#_TimeOut = setTimeout(() => {
            /* debughome */
            this.EmitEvents_logger_log({level: 'E', msg: `No response from DataBase. Using default template for debug`});
            let arr1 = [
                { ID: 1, Status: "active", Name: "PLC11", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.151", Port: "8080", SensorChExpected: 64 },
                { ID: 15, Status: "inactive", Name: "PLC12", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.152", Port: "8080", SensorChExpected: 64 },
                { ID: 2, Status: "active", Name: "PLC21", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.156", Port: "443", SensorChExpected: 64 },
                { ID: 3, Status: "active", Name: "PLC22", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.157", Port: "8080", SensorChExpected: 64 },
                { ID: 4, Status: "active", Name: "PLC31", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.161", Port: "8080", SensorChExpected: 64 },
                { ID: 5, Status: "active", Name: "PLC32", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.162", Port: "8080", SensorChExpected: 64 },
                { ID: 6, Status: "active", Name: "hubc445", Type: "source", Property: "r", Protocol: "rpi", DN: "", IP: "192.168.50.233", Port: "7777", SensorChExpected: 64 },
                { ID: 7, Status: "active", Name: "Broker01", Type: "source", Property: "w", Protocol: "mqttgw", DN: "", IP: "localhost", Port: "9001", Login: 'operator2', Password: '34pass', SensorChExpected: 64 },
            ];
            let arr2 = [
                { Name: "process", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "primary", InitOrder: 10, Protocol: 'sys', PrimaryBus: 'sysBus', BusList: ['logBus', 'mdbBus', 'dataBus'], EventList: ['process-config-system-get', 'process-ws-connect-done', 'process-mqtt-connect-done', 'process-rpi-connect-done'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'Process desription'},
                { Name: "logger", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "primary", InitOrder: 30, Protocol: 'sys', PrimaryBus: 'logBus', BusList: ['sysBus', 'mdbBus', 'dataBus', 'rpiBus', 'lhpBus', 'mqttBus'], EventList: ['logger-log', 'all-init-stage1-set'], AdvancedOptions: {}, Dependency: ['srvService', 'graylog2'], Description: 'Logger desription'},
                { Name: "providermdb", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "primary", InitOrder: 20, Protocol: 'sys', PrimaryBus: 'mdbBus', BusList: ['logBus', 'sysBus'], EventList: ['event1', 'event2', 'event3', 'event4'], AdvancedOptions: {}, Dependency: ['srvService', 'mongodb'], Description: 'Provider desription'},
                { Name: "dm", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "primary", InitOrder: 40, Protocol: 'sys', PrimaryBus: 'sysBus', BusList: ['logBus', 'mdbBus', 'dataBus'], EventList: ['all-init-stage1-set', 'all-close', 'all-connections-done', 'mqttclient-send'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'Device Manager desription'},
                { Name: "wsclient", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 50, Protocol: 'lhp', PrimaryBus: 'lhpBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close', 'wsclient-connect'], AdvancedOptions: {}, Dependency: ['srvService', 'ws'], Description: 'WSClient desription'},
                { Name: "proxywsclient", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 60, Protocol: 'lhp', PrimaryBus: 'lhpBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close', 'proxywsclient-msg-get', 'proxywsclient-send'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'ProxyWS desription'},
                { Name: "mqttclient", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 70, Protocol: 'mqtt', PrimaryBus: 'mqttBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close', 'all-connections-done', 'mqttclient-send'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'MQTT client desription'},
                { Name: "proxymqtt", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 80, Protocol: 'mqtt', PrimaryBus: 'mqttBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close', 'proxymqttclient-get-msg', 'proxymqttclient-send', 'proxymqttclient-deviceslist-get'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'Proxymqtt desription'},
                { Name: "mqttgw", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 90, Protocol: 'mqttgw', PrimaryBus: 'mqttGwBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-connect'], AdvancedOptions: {}, Dependency: ['srvService', 'mqtt'], Description: 'MqttGateway desription'},
                { Name: "proxymqttgw", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 100, Protocol: 'mqttgw', PrimaryBus: 'mqttGwBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-connect'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'MqttGateway desription'},
                { Name: "rpiclient", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 110, Protocol: 'rpi', PrimaryBus: 'rpiBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'RpiClient desription'},
                { Name: "proxyrpiclient", Status: 'stopped', ErrorMsg: '', Service: null, Importance: "auxilary", InitOrder: 120, Protocol: 'rpi', PrimaryBus: 'rpiBus', BusList: ['logBus', 'sysBus'], EventList: ['all-init-stage1-set', 'all-close', 'proxyrpiclient-msg-get', 'proxyrpiclient-send', 'proxyrpiclient-deviceslist-get'], AdvancedOptions: {}, Dependency: ['srvService'], Description: 'ProxyRpiClient desription'}
                
            ];
            let arr3 = [
                { ID: 21, Name: "template-lhp-service-channel", Service: null, Status: "stopped", Importance: "application", InitOrder: 1000, Protocol: "lhp", PrimaryBus: "dataBus", BusList: [ "sysBus", "logBus", "mdbBus", "lhpBus"], EventList: [ "all-init-stage1-set", "all-data-raw-get", "dm-deviceslist-set", "providermdb-device-config-set"], Dependency: ["srvService"], ErrorMsg: "", Description: "Служба предназначена для обеспечения работы с измерительным или испольнительным каналом по протоколу lhp/ws." },
                { ID: 22, Name: "template-mqtt-service-channel", Service: null, Status: "stopped", Importance: "application", InitOrder: 1000, Protocol: "mqtt", PrimaryBus: "dataBus", BusList: [ "sysBus", "logBus", "mdbBus", "mqttBus"], EventList: [ "all-init-stage1-set", "all-data-raw-get", "dm-deviceslist-set", "providermdb-device-config-set"], Dependency: ["srvService"], ErrorMsg: "", Description: "Служба предназначена для обеспечения работы с измерительным или испольнительным каналом по протоколу mqtt." },
                { ID: 23, Name: "template-rpi-service-channel", Service: null, Status: "stopped", Importance: "application", InitOrder: 1000, Protocol: "rpi", PrimaryBus: "dataBus", BusList: [ "sysBus", "logBus", "mdbBus", "rpiBus"], EventList: [ "all-init-stage1-set", "all-data-raw-get", "dm-deviceslist-set", "providermdb-device-config-set"], Dependency: ["srvService"], ErrorMsg: "", Description: "Служба предназначена для обеспечения работы с измерительным или испольнительным каналом по протоколу rpi." }
            ];
            /*
            let arr4 = [
                //{ ChStatus: "active", ChType: "actuator", ChAlias: "sys_buzzer", ChMeas: "herz", SourceName: "PLC31", DeviceId: "01", ChNum: 0, DeviceIdHash: "93ce-a6a4-2e7a-7b42" },
                //{ ChStatus: "active", ChType: "actuator", ChAlias: "sys_LED", ChMeas: "lumen", SourceName: "PLC31", DeviceId: "03", ChNum: 0, DeviceIdHash: "93ce-a6a4-2e7a-7b42" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "light", ChMeas: "lux", SourceName: "PLC31", DeviceId: "04", ChNum: 0, DeviceIdHash: "e8fb-b1b0-2899-488d" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "gl5528_esistance", ChMeas: "ohm", SourceName: "PLC31", DeviceId: "04", ChNum: 1, DeviceIdHash: "e8fb-b1b0-2899-488d" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "temperature-garden", ChMeas: "°C", SourceName: "PLC31", DeviceId: "05", ChNum: 0, DeviceIdHash: "e8fb-abb0-2899-3e5b" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "pressure-third-floor", ChMeas: "kPa", SourceName: "PLC31", DeviceId: "05", ChNum: 1, DeviceIdHash: "e8fb-abb0-2899-3e5b" },
                { ChStatus: "active", ChType: "actuator", ChAlias: "system-buzzer", ChMeas: "", SourceName: "PLC11", DeviceId: "01", ChNum: 0, DeviceHash: "93ce-a6a4-2e7a-7b42" },
                { ChStatus: "active", ChType: "actuator", ChAlias: "system-led", ChMeas: "", SourceName: "PLC11", DeviceId: "03", ChNum: 0, DeviceHash: "93ce-a6a4-2e7a-7b42" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "main-door-button",  ChMeas: "", SourceName: "PLC11", DeviceId: "04", ChNum: 0, DeviceHash: "f19f-2bed-16d6-acb1" },
                //{ ChStatus: "active", ChType: "sensor", ChAlias: "robot-potentiomemter", ChMeas: "", SourceName: "PLC11", DeviceId: "05", ChNum: 0, DeviceIdHash: "f1f4-2aeb-3c24-7cf5" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "air-quality-eCO2", ChMeas: "ppm", SourceName: "PLC21", DeviceId: "04", ChNum: 0, DeviceHash: "ef9a-4677-86c2-1e79" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "air-quality-TOVC", ChMeas: "pbm", SourceName: "PLC21", DeviceId: "04", ChNum: 1, DeviceHash: "ef9a-4677-86c2-1e79" },
                
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-cpu-tmprt", ChMeas: "°C", SourceName: "hubc445", DeviceId: "rpi", ChNum: 0, DeviceHash: "2905-4672-27c2-f8ef" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-cpu-load", ChMeas: "%", SourceName: "hubc445", DeviceId: "rpi", ChNum: 1, DeviceHash: "2905-4672-27c2-f8ef" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-total-mem", ChMeas: "gb", SourceName: "hubc445", DeviceId: "rpi", ChNum: 2, DeviceHash: "2905-4672-27c2-f8ef" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-used-mem", ChMeas: "gb", SourceName: "hubc445", DeviceId: "rpi", ChNum: 3, DeviceHash: "2905-4672-27c2-f8ef" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-free-mem", ChMeas: "gb", SourceName: "hubc445", DeviceId: "rpi", ChNum: 4, DeviceHash: "2905-4672-27c2-f8ef" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "rpi-avail-mem", ChMeas: "gb", SourceName: "hubc445", DeviceId: "rpi", ChNum: 5, DeviceHash: "2905-4672-27c2-f8ef"},
                /*{ ChStatus: "active", ChType: "sensor", ChAlias: "p11-di", ChMeas: "digital", SourceName: "PLC31", DeviceId: "06", ChNum: 0, DeviceHash: "cb288b276ea738f6" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "p12-ai", ChMeas: "analog", SourceName: "PLC31", DeviceId: "07", ChNum: 0, DeviceHash: "cb288b276ea738f6" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "p11-di", ChMeas: "digital", SourceName: "PLC11", DeviceId: "06", ChNum: 0, DeviceHash: "cb288b276ea738f6" },
                { ChStatus: "active", ChType: "sensor", ChAlias: "p12-ai", ChMeas: "analog", SourceName: "PLC11", DeviceId: "07", ChNum: 0, DeviceHash: "cb288b276ea738f6" },
                { ChStatus: "active", ChType: "actuator", ChAlias: "a0-ao", ChMeas: "analog", SourceName: "PLC21", DeviceId: "04", ChNum: 0, DeviceHash: "68b8e34a3dbf1f7d" },
                { ChStatus: "active", ChType: "actuator", ChAlias: "p12-do", ChMeas: "digital", SourceName: "PLC21", DeviceId: "05", ChNum: 0, DeviceHash: "68b8e34a3dbf1f7d" },
                
                { ChStatus: "active", ChType: "sensor", ChAlias: "mqtt_sensor", ChMeas: "digital", SourceName: "brokerhubc445", DeviceId: "00", ChNum: 0, DeviceIdHash: "7d60-42b3-19b7-03db", Address: "horizon/temp/00-0" },
                { ChStatus: "active", ChType: "actuator", ChAlias: "mqtt_actuator", ChMeas: "digital", SourceName: "brokerhubc445", DeviceId: "01", ChNum: 0, DeviceIdHash: "8654-61b3-1ede-51ac", Address: "horizon/temp/01-0" }
                
            ];
            */
            this.Fill(arr2, arr1, arr3, arr4);
            /* debugend */
        }, PROCESS_DB_TIMEOUT);
    }
    /**
     * @method
     * @description Сохраняет ссылки на используемые шины, информацию об источниках и инициализирует базовые обработчики
     * @param {InitOpts} arg - объект со ссылками на внешние зависимости 
     */
    async HandlerEvents_process_ws_connect_done(_topic, _msg) {       
        //this.EmitEvents_proxy_send({ value: msg_to_PLC, arg: [source_name] })
        this.EmitEvents_logger_log({level: 'I', msg: 'Ready to send info to dm!'});
        this.EmitEvents_all_connections_done();
    }
    EmitEvents_all_connections_done() {
        const msg = {
            com: 'all-connections-done',
        }
        this.EmitMsg('sysBus', msg.com, msg);
    }
    /**
     * @method
     * @description Вызывает заполнение стейтов из полученных массивов
     * @param {InitOpts} arg - объект со ссылками на внешние зависимости
     */
    HandlerEvents_providermdb_init_stage0_get(_topic, _msg) {
        clearTimeout(this.#_TimeOut);
        this.Fill(_msg.arg[0], _msg.arg[2], _msg.arg[4], _msg.arg[5]);
    }
    /**
     * @method
     * @description Запускает событие init-stage0
     * @returns msg
     */
    EmitEvents_process_init0() {
        const msg = {
            com: 'providermdb-init-stage0-set',
            dest: 'providermdb',
            demandRes: true,
            resCom: 'providermdb-init-stage0-get',
            arg: [],
            value: []
        }
        return this.EmitMsg('mdbBus', msg.com, msg);
    }
    /**
     * @method
     * @description Запускает событие init-stage1
     * @returns msg
     */
    EmitEvents_all_init_stage1() {
        const msg = {
            dest: 'all',
            com: 'all-init-stage1-set',
            arg: [ { SourcesState: this._SourcesState, ServicesState: this._ServicesState }]
        }
        this.EmitMsg('sysBus', msg.com, msg);
    }
    /**
     * @method
     * @description Запускает событие all_connect
     * @returns msg
     */
    EmitEvents_all_connect() {
        const msg = {
            dest: 'all',
            com: 'all-connect',
            arg: [],
            value: []
        }
        this.EmitMsg('sysBus', msg.com, msg);
    }
    /**
     * @method
     * @description Запускает событие all_disconnect
     * @returns msg
     */
    EmitEvents_all_disconnect() {
        const msg = {
            dest: 'all',
            com: 'all-disconnect',
            arg: [],
            value: []
        }
        this.EmitMsg('sysBus', msg.com, msg);
    }
    /**
     * @method
     * @description
     * Заполняет служебные контейнеры по полученным из БД массивам источников и служб
     * @param {Array} _dbServices    - массив служб
     * @param {Array} _dbSources    - массив источников 
     */
    Fill(_dbServices, _dbSources, _dbTemplates, _dbChannels) {
        if (!_dbServices) {
            this.EmitEvents_logger_log({level: 'C', msg: 'Missing services!', obj: _dbServices});
        }
        if (!_dbSources) {
            this.EmitEvents_logger_log({level: 'C', msg: 'Missing sources!', obj: _dbSources});
        }

        if (!_dbChannels) {
            this.EmitEvents_logger_log({level: 'C', msg: 'Missing channels!', obj: _dbChannels});
        }

        if (!_dbServices && !_dbSources) {
            return;
        }

        // Обновляем основные службы
        if (_dbServices) {
            _dbServices.forEach(service => {
                if (service.Importance === 'primary') {
                    if (this.#_ServicesState[service.Name] && this.#_ServicesState[service.Name].Service) {
                        service.Service = this.#_ServicesState[service.Name].Service;
                        this.#_ServicesState[service.Name] = service;
                    }
                    else {
                        this.EmitEvents_logger_log({level: 'E', msg: `Primary service ${service.Name} is not initialized.`, obj:  this.#_ServicesState[service.Name]});
                    }
                }
            })
        }

        // Заполняем источники
        if (_dbSources) {
            _dbSources.forEach(source => {
                const protocol = source.Protocol.toLowerCase();
                _dbServices
                    .filter(service => service.Protocol === protocol && !this.#_ServicesState[service.Name])
                    .forEach(service => {
                        if (!this.#_GBusList[service.PrimaryBus]) {
                            this.CreateBus(service.PrimaryBus);
                        }
                        service.Service = new (require(SERV_REQ_LIST[service.Name]))({_busList: this.#_GBusList, _node: this.#_Node});
                        this.#_ServicesState[service.Name] = service;
                })
                source.CheckProcess = true;
                source.IsConnected = false;
                this.#_SourcesState[source.Name] = source;
            })
        }
    
        // Создаём каналы
        if (_dbTemplates && _dbChannels) {
            _dbChannels.forEach(channel => {
                const source = this.#_SourcesState[channel.SourceName];
                if (source) {
                    let chService = Object.assign({}, _dbTemplates.find(template => template.Protocol == source.Protocol));
                    chService.AdvancedOptions = channel;
                    chService.Service = new (require(SERV_REQ_LIST[channel.ChType]))({_busList: this.#_GBusList, _busNameList: chService.BusList.concat([chService.PrimaryBus]), _advOpts: channel});
                    chService.Name = chService.Service.Name;
                    this.#_ServicesState[chService.Name] = chService;
                }
            })
        }

        // Ждём, тогда создадутся службы
        setTimeout(() => {
            this.EmitEvents_logger_log({level: 'I', msg: 'State lists are formed!'});
            this.EmitEvents_all_init_stage1();
            setTimeout(() => {// ждём 3 секунды на проверку служб
                const errList = Object.keys(this.#_ServicesState).filter(key => this.#_ServicesState[key].Status === 'stopped' && this.#_ServicesState[key].Importance === 'primary');
                const srvList = Object.keys(this.#_ServicesState).filter(key => this.#_ServicesState[key].Status === 'running');
                
                if (errList.length > 0) {
                    this.#_ServicesState[this.Name].ErrorMsg = 'Failed initialization';
                    this.EmitEvents_logger_log({level: 'E', msg: 'Uninitialized primary services!', obj: {names: errList}});
                }
                this.EmitEvents_logger_log({level: 'I', msg: 'System startup finished!', obj: {services: srvList}});
            }, PROCESS_CHECK_TIMEOUT);
        }, PROCESS_BUS_TIMEOUT);
    }
    /**
     * @method
     * @description Запуск подключений к источникам
     */
    Connect() {
        this.EmitEvents_all_connect();
    }
    /**
     * @method
     * @description Отключение от источников
     */
    Disconnect() {
        this.EmitEvents_all_disconnect();
    }
    /* debughome */
    /**
     * @method
     * Возвращает из базы данных список доступных клиентов и имена событий для генерации
     * @returns Array[Object]   sources - массив объектов с описанием клиентов
     */
    GetSourceClients() {// Заглушка
        let sources = [{id: 0, name: "WebSocket", genEvent: "connect"}];
        return sources;
    }
    GatewayTest() {
        const chList = Object.keys(this.#_ServicesState).filter(key => this.#_ServicesState[key].PrimaryBus === 'dataBus');
        this.#_TestInterval = setInterval(() => {
            chList.forEach(channel => {
                console.log(this.#_ServicesState);
                this.#_ServicesState[channel].Service.Value = (Math.random() * 100).toFixed(3);
            })
        }, 5000);
    }
    GatewayTestStop() {
        clearTimeout(this.#_TestInterval);
    }
    /* debugend */
    get _SourcesState() {
        return this.#_SourcesState;
    }
    get _ServicesState() {
        return this.#_ServicesState;
    }
}

module.exports = ClassProcessSrv;
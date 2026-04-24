const ClassBaseService_S = require('./../../srvService/js/srvService');

const PRIMARY_BUS = 'modbusnlsBus';
const EXPLOIT_BUS = 'modbusrotBus';
const CONNECTION_TIMEOUT = 5000;

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect', 'all-disconnect'];
EVENT_MODBUS_LIST = ['modbusclientnls-send'];
EVENT_EXPLOIT_LIST = ['modbusnls-msg-get'];
BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus', EXPLOIT_BUS];
const PROTOCOL = 'mbnls';
const THIS_NAME = 'modbusNLS';

REG_OUT = {
    'Coil' : 0x01,
    'discInput': 0x02, 
    'holdReg': 0x03, 
    'inputReg': 0x04
};
REG_IN = {
    'Coil' : 0x05,
    'holdReg': 0x06,
    'Coils' : 0x0F,
    'holdRegs': 0x10
};

BAUD_RATES = {
    0x4: 2400,
    0x5: 4800,
    0x6: 9600,
    0x7: 19200,
    0x8: 38400,
    0x9: 57600,
    0x0A: 115200
};

class RL_NLS extends ClassBaseService_S {
    #_Sources;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.#_Sources = {};
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(PRIMARY_BUS, EVENT_MODBUS_LIST);
        this.FillEventOnList(EXPLOIT_BUS, EVENT_EXPLOIT_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'ModbusNLS initialized.'});
    }

    EmitEvents_proxymodbusnls_msg_get({arg, value}) {
        const msg = {
            dest: 'proxymodbusnls',
            com: 'proxymodbusnls-msg-get',
            arg,
            value
        };
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
    }

    /**
     * @method
     * @description Запускает событие proxymodbus-msg-get
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_modbusnls_source_toss({arg, value}) {
        const msg = {
            dest: 'modbusclientrot',
            com: 'modbus-source-toss',
            arg,
            value
        };
        
        this.EmitMsg(EXPLOIT_BUS, msg.com, msg);
    }

    /**
     * @method
     * @description Отправляет команду на испольнение в modbusclient
     * @param {*} param0 
     */
    EmitEvents_enqueue_command({arg, value}) {
        const msg = {
            dest: 'modbusclientrot',
            com: 'enqueue-command',
            arg,
            value
        };
        
        this.EmitMsg(EXPLOIT_BUS, msg.com, msg);
    }

    HandlerEvents_modbusnls_msg_get( _topic, _msg ){
        const srcName = _msg.arg[0];
        const srcComm = _msg.arg[1];
        const val = _msg.value[0];

        try {
            switch (srcComm.reg) {
            case 0x00:
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 0], value: [(val.data[0] == 1 ? 'Питание от сети' : 'Питание от аккомулятора')]});
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 3], value: [val.data[3] / 10]});
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 4], value: [val.data[4] / 10]});
                break;
            case 0x01:
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 1], value: [val.data[0] / 10]});
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 2], value: [val.data[1] / 1000]});
                break;
            case 0x10:
                this.EmitEvents_proxymodbusnls_msg_get({arg: [srcName, 5], value: [(val.data[0] == 1 ? 'Выход включен' : 'Выход выключен')]});
                break;
            case 0xC8:
                let nameString = '';
                for (const num of val.data) {
                    const highByte = (num >> 8) & 0xFF;
                    const lowByte = num & 0xFF;
                    
                    if (highByte <= 127) nameString += String.fromCharCode(highByte);
                    if (lowByte <= 127) nameString += String.fromCharCode(lowByte);
                    
                }
                this.#_Sources[srcName].Stats.Name = nameString;
                break;
            case 0xD4:
                let verString = '';
                for (const num of val.data) {
                    const highByte = (num >> 8) & 0xFF;
                    const lowByte = num & 0xFF;
                    
                    if (highByte <= 127) verString += String.fromCharCode(highByte);
                    if (lowByte <= 127) verString += String.fromCharCode(lowByte);
                }
                this.#_Sources[srcName].Stats.Version = verString;
                break;
            case 0x0200:
                this.#_Sources[srcName].Stats.Address = val.data[0];
                break;
            case 0x0201:
                this.#_Sources[srcName].Stats.Baudrate = BAUD_RATES[val.data[0]] ?? 0;
                break;
            default:
                break;
            }
        }
        catch (e) {
            console.log (e.message);
        }
        
    }

    HandlerEvents_modbusclientnls_send( _topic, _msg ){
        const source = _msg.arg[0];
        const grpID = _msg.arg[1];
        const [state] = _msg.value[0].value;

        
    }

    Start( _name, _source ) {        
        if (_source.Groups != undefined && _source.Groups.length > 0) {                
            _source.Groups.forEach((group) => {
                if (group.beh == 'SensorGeneral') {
                    setInterval(() => {
                        let comm = {
                            id: 0x03,
                            reg: 0x00,
                            len: 5,
                            dat: 0,
                            mbID: group.mbID
                        }
                        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm]});
                    },group.interval);
                }
                else if (group.beh == 'SensorElectro') {
                    setInterval(() => {
                        let comm = {
                            id: 0x03,
                            reg: 0x01,
                            len: 2,
                            dat: 0,
                            mbID: group.mbID
                        }
                        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm]});
                    },group.interval);
                }
                else if (group.beh == 'SensorOutput') {
                    setInterval(() => {
                        let comm = {
                            id: 0x03,
                            reg: 0x10,
                            len: 1,
                            dat: 0,
                            mbID: group.mbID
                        }
                        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm]});
                    },group.interval);
                }
            })
        }
    }

    UpdateStats( _name, _source ) {        
        _source.Stats = {};
        let comm1 = {
            id: 0x03,
            reg: 0xC8,
            len: 4,
            dat: 0,
            mbID: _source.Groups[0].mbID
        }
        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm1]});
        let comm2 = {
            id: 0x03,
            reg: 0xD4,
            len: 4,
            dat: 0,
            mbID: _source.Groups[0].mbID
        }
        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm2]});
        let comm3 = {
            id: 0x03,
            reg: 0x0200,
            len: 1,
            dat: 0,
            mbID: _source.Groups[0].mbID
        }
        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm3]});
        let comm4 = {
            id: 0x03,
            reg: 0x0201,
            len: 1,
            dat: 0,
            mbID: _source.Groups[0].mbID
        }
        this.EmitEvents_enqueue_command({ arg: [_name], value: [comm4]});
    }


    /**
     * @method
     * @description Обработчик события, запускает подключение к источникам
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_test_connect(_topic, _msg) {
        this.EmitEvents_logger_log({level: 'I', msg: 'Connection starting. . .'});
        this.Connect();
    }    

    /**
     * @method
     * @description Инициализирует соединение с источниками
     */
    Connect() {
        let sourcesCount = 0;
        let tOut = setTimeout(() => {
            Object.entries(this.#_Sources).forEach(([name, source]) => {
                if (source.IsConnected) {
                    this.EmitEvents_logger_log({level: 'I', msg: `${name} connected`, obj: source});
                    this.UpdateStats(name, source);
                    this.Start(name, source);
                }
                else {
                    console.log(`${name} unconnected`);
                }
            });
            this.EmitEvents_logger_log({level: 'I', msg: `Connections done!`, obj: this.SourcesState});
            console.log(`Connections done by NLS!`);            
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach((source) => {
                this.#_Sources[source.Name] = source;
                this.EmitEvents_modbusnls_source_toss({ arg: [{dest: THIS_NAME, com: 'modbusnls-msg-get'}], value: [source]});
                sourcesCount++;
        });
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = RL_NLS;


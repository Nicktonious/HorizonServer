const ClassBaseService_S = require('./../../srvService/js/srvService');

const PRIMARY_BUS = 'modbusdrsBus';
const EXPLOIT_BUS = 'modbusrotBus';
const CONNECTION_TIMEOUT = 5000;

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect', 'all-disconnect'];
EVENT_MODBUS_LIST = ['modbusclientdrs-send'];
EVENT_EXPLOIT_LIST = ['modbusdrs-msg-get'];
BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus', EXPLOIT_BUS];
const PROTOCOL = 'mbdrs';
const THIS_NAME = 'modbusDRS';

const SCALE_FACTORS = {
    0x0: 0,
    0x4: 0.001,
    0x5: 0.01,
    0x6: 0.1,
    0x7: 1,
    0x8: 10,
    0x9: 100
};

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

class MW_DRS240 extends ClassBaseService_S {
    static SCALE_FACTORS = SCALE_FACTORS;
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
        this.EmitEvents_logger_log({level: 'I', msg: 'ModbusDRS initialized.'});
    }

    EmitEvents_proxymodbusdrs_msg_get({arg, value}) {
        const msg = {
            dest: 'proxymodbusdrs',
            com: 'proxymodbusdrs-msg-get',
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
    EmitEvents_modbusdrs_source_toss({arg, value}) {
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

    HandlerEvents_modbusdrs_msg_get( _topic, _msg ){
        const srcName = _msg.arg[0];
        const srcComm = _msg.arg[1];
        const val = _msg.value[0];

        switch (srcComm.reg) {
            case 0xC0:
                this.#_Sources[srcName].Scales = {
                    I_OUT: MW_DRS240.SCALE_FACTORS[(val.data[0] & 0xF000) >> 12],
                    V_OUT: MW_DRS240.SCALE_FACTORS[(val.data[0] & 0x0F00) >> 8],
                    FAN_SPEED: MW_DRS240.SCALE_FACTORS[(val.data[0] & 0x00F0) >> 4],
                    V_IN: MW_DRS240.SCALE_FACTORS[val.data[0] & 0x000F],
                    CURVE_TOUT: MW_DRS240.SCALE_FACTORS[(val.data[1] & 0xF000) >> 12],
                    TEMP_1: MW_DRS240.SCALE_FACTORS[(val.data[1] & 0x0F00) >> 8],
                    I_IN: MW_DRS240.SCALE_FACTORS[(val.data[1] & 0x00F0) >> 4]
                }
                break;
            case 0x60:
                this.EmitEvents_proxymodbusdrs_msg_get({arg: [srcName, 0], value: [val.data[0] * this.#_Sources[srcName].Scales.V_OUT]});
                this.EmitEvents_proxymodbusdrs_msg_get({arg: [srcName, 1], value: [val.data[1] * this.#_Sources[srcName].Scales.I_OUT]});
                break;
            case 0x40:
                const status = {
                    FAN_FAIL: val.data[0] & 1,
                    INNER_TEMP: (val.data[0] & 2) >> 1,
                    OUTPUT_VOLT: (val.data[0] & 4) >> 2,
                    OUTPUT_CURR: (val.data[0] & 8) >> 3,
                    SHORT_CIRCUIT: (val.data[0] & 16) >> 4,
                    AC_FAIL: (val.data[0] & 32) >> 5,
                    DC_FAIL: (val.data[0] & 64) >> 6,
                    AMB_TEMP: (val.data[0] & 128) >> 7,
                }
                this.EmitEvents_proxymodbusdrs_msg_get({arg: [srcName, 2], value: [JSON.stringify(status)]});
                break;
            default:
                break;
        }
    }

    HandlerEvents_modbusclientdrs_send( _topic, _msg ){
        const source = _msg.arg[0];
        const grpID = _msg.arg[1];
        const [state] = _msg.value[0].value;

        
    }

    UpdateScalingStatus() {
        Object.entries(this.#_Sources).forEach(source => {
            let comm = {
                id: 0x03,
                reg: 0xC0,
                dat: 0,
                len: 2,
                mbID: 131
            };
            this.EmitEvents_enqueue_command({ arg: [source[0]], value: [comm]});
        })
    }

    Start() {
        Object.entries(this.#_Sources).forEach(([name, source]) => {
            console.log(source.Groups);
            if (source.Groups != undefined && source.Groups.length > 0) {                
                source.Groups.forEach((group) => {
                    if (group.beh == 'Sensor') {
                        setInterval(() => {
                            let comm = {
                                id: REG_OUT[group.type],
                                reg: group.startReg,
                                len: group.numRegs,
                                dat: 0,
                                mbID: group.mbID
                            }
                            this.EmitEvents_enqueue_command({ arg: [name], value: [comm]});
                        },group.interval);
                    }                    
                })
            }
        })
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
            this.EmitEvents_logger_log({level: 'I', msg: `Connections done!`, obj: this.SourcesState});
            console.log(`Connections done by DRS!`);
            this.UpdateScalingStatus();
            this.Start();
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach((source) => {
                this.#_Sources[source.Name] = source;
                this.EmitEvents_modbusdrs_source_toss({ arg: [{dest: THIS_NAME, com: 'modbusdrs-msg-get'}], value: [source]});
                sourcesCount++;
        });
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = MW_DRS240;


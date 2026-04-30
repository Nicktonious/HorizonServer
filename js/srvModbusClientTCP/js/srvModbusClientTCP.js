const ClassModbusBase_S = require('./../../srvModbusBase/js/srvModbusBase');

const CONNECTION_TIMEOUT = 5000;
const PRIMARY_BUS = 'modbustcpBus';

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect', 'all-disconnect'];
EVENT_MODBUS_LIST = ['modbusclienttcp-send'];
BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus'];
const PROTOCOL = 'modbustcp';
const THIS_NAME = 'modbusclienttcp';
const DEFAULT_PORT = 502;

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

class ModbusClientTCP extends ClassModbusBase_S {
    #_Sources;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node, _type: 'TCP' });
        this.#_Sources = {};
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(PRIMARY_BUS, EVENT_MODBUS_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'MBClient initialized.'});
    }
    /**
     * @method
     * @description Запускает событие proxymodbus-msg-get
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_proxymodbustcp_msg_get({arg, value}) {
        const msg = {
            dest: 'proxymodbustcp',
            com: 'proxymodbustcp-msg-get',
            arg,
            value
        };
        this.EmitMsg(PRIMARY_BUS, msg.com, msg);
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
     * @description Обработчик события, запускает отправку сообщения по указанному сокету
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_modbusclienttcp_send(_topic, _msg) {
        try {
            const [source_name] = _msg.arg[0];
            const chNum = _msg.arg[1];
            const [value] = _msg.value;

            if (this.#_Sources[source_name].groups == undefined &&
                    this.#_Sources[source_name].groups.length == 0)
                throw `No specified channel groups for ${source_name}`;

            let dest_group = this.#_Sources[source_name].groups.find(group => group.beh == 'Actuator' && chNum >= group.startReg && chNum <= group.startReg + group.numRegs);
            if (dest_group === undefined)
                throw `Cannot find channel '${chNum}' in configuration of ${source_name}`;

            const val = REG_IN[dest_group.type] <= 0x06 ? value.value[0] : value.value;

            let comm = {
                id: REG_IN[dest_group.type],
                reg: chNum,
                len: 0,
                dat: val,
                mbID: 1
            }

            this.Queue_client_command(this.#_Sources[source_name].client, comm, (data, err) => {
                if (err) {
                    console.log(err.message);
                }
                else {
                    data.data.forEach((dat, i) => {                    
                        this.EmitEvents_proxymodbustcp_msg_get({arg: [source_name, i + chNum], value: [dat]});
                    })
                }
            })
        }
        catch (e) {
            this.EmitEvents_logger_log({level: 'W', msg: `Failed to send command via modbus protocol: ${e.message}`, obj: {exception: e.toString()}});
        }
    }
    /**
     * @method
     * @description Обработчик события, закрывает все существующие сокеты
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_all_disconnect(_topic, _msg) {
        Object.values(this.#_Sources).forEach(source => {
            source.close();
        });
    }

    Add_new_source ( _source ) {
        let name = _source.Name;
        let ip = (_source.DN ? _source.DN : _source.IP);
        let port = _source.Port || DEFAULT_PORT;

        let client;

        let usedSource = Object.values(this.#_Sources)
            .find(source => (source.client.ip == ip && source.client.port == port));
        if (usedSource == undefined) {
            client = {
                mbclient: this.Initialize_modbus_client({ip: ip, port: port}), 
                commQueue: [], 
                isOccupied: false, 
                ip: ip, 
                port: port,
                failCounter: 0
            };
        }
        else {
            client = usedSource.client;
        }

        client.mbclient._port._client.on('connect', () => {
            _source.IsConnected = true;
            this.#_Sources[name].IsConnected = true;
        })

        client.mbclient._port._client.on('close', () => {
            _source.IsConnected = false;
            this.#_Sources[name].IsConnected = false;
            console.log('Closed by event');
        })

        if (client.mbclient != undefined) {
            this.#_Sources[name] = {client: client, groups: _source.Groups, IsConnected: false};
        }
        else {
            console.log(`${name} out of reach`);
            this.EmitEvents_logger_log({level: 'W', msg: `Failed to connect to ${name}`, obj: this.SourcesState});
        }
        
    }

    /**
     * @method
     * @description Начинает циклический опрос групп каналов по источникам
     */
    Start() {
        Object.entries(this.#_Sources).forEach(([name, source]) => {
            if (source.groups != undefined && source.groups.length > 0) {
                source.groups.forEach((group) => {
                    if (group.beh == 'Sensor' && group.startReg != null) {
                        setInterval(() => {
                            let comm = {
                                id: REG_OUT[group.type],
                                reg: group.startReg,
                                len: group.numRegs,
                                dat: 0,
                                mbID: group.mbID
                            }

                            if (source.IsConnected) {
                                this.Queue_client_command(source.client, comm, (data, err) => {
                                    if (err) { 
                                        console.log(err.message);
                                    //    this.EmitEvents_logger_log({level: 'W', msg: `No data recieved from: ${name}`, obj: source.client});
                                    }
                                    else {
                                        data.data.forEach((dat, i) => {
                                            this.EmitEvents_proxymodbustcp_msg_get({arg: [name, i + group.startReg], value: [dat]});
                                        })
                                    }
                                })
                            }
                        },group.interval);
                    }                   
                })
            }
        })
    }

    /**
     * @method
     * @description Инициализирует соединение с источниками
     */
    Connect() {
        let sourcesCount = 0;
        let tOut = setTimeout(() => {
            this.EmitEvents_logger_log({level: 'I', msg: `Connections done!`, obj: this.SourcesState});
            this.Start();
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach((source) => {
                this.Add_new_source(source);
                sourcesCount++;
        });
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = ModbusClientTCP;
const ClassBaseService_S = require('srvService');
const jsModbus = require('jsmodbus')
const net = require('net')

const CONNECTION_TIMEOUT = 5000;
const PRIMARY_BUS = 'modbusBus';

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'test-connect', 'all-disconnect'];
EVENT_MODBUS_LIST = ['modbusclient-send'];
BUS_NAMES_LIST = ['sysBus', PRIMARY_BUS, 'logBus'];
const PROTOCOL = 'modbus';
const THIS_NAME = 'modbusclient';
const DEFAULT_PORT = 502;

const TYPE_HOLD_REG = 'holdReg';
const TYPE_COIL = 'Coil';
const TYPE_DISC_INPUT = 'discInput';
const TYPE_INPUT_REG = 'inputReg';

class ModbusClient extends ClassBaseService_S {
    #_Sockets;
    #_Servers;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.#_Sockets = {};
        this.#_Servers = {};
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList(PRIMARY_BUS, EVENT_MODBUS_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'MBClient initialized.'});
    }
    /**
     * @method
     * @description Запускает событие proxymodbus-msg-get
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_proxymodbus_msg_get({arg, value}) {
        const msg = {
            dest: 'proxymodbus',
            com: 'proxymodbus-msg-get',
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
    HandlerEvents_modbusclient_send(_topic, _msg) {
        try {
            const [source_name] = _msg.arg[0];
            const chNum = _msg.arg[1];
            const [value] = _msg.value;
            const [val] = value.value;

            if (this.#_Servers[source_name].groups == undefined &&
                    this.#_Servers[source_name].groups.length == 0)
                throw `No specified channel groups for ${source_name}`;

            let dest_group = this.#_Servers[source_name].groups.find(group => chNum >= group.startReg && chNum <= group.startReg + group.numRegs);
            if (dest_group === undefined)
                throw `Cannot find channel '${chNum}' in configuration of ${source_name}`;

            switch (dest_group.type) {
                case TYPE_COIL:
                    this.#_Servers[source_name].client.writeSingleCoil(chNum-1, val).then((resp) => {
                        this.EmitEvents_proxymodbus_msg_get({arg: [source_name, chNum], value: [val]});
                        this.EmitEvents_logger_log({level: 'I', msg: `Message sent to ${source_name}`});
                    }).catch(() => {
                        this.EmitEvents_logger_log({level: 'E', msg: `Failed to write to modbus source ${source_name}.`, obj: 
                            require('util').inspect(arguments, {
                                depth: null
                            })});
                    })
                    break;
                case TYPE_HOLD_REG:
                    this.#_Servers[source_name].client.writeSingleRegister(chNum-1, val).then((resp) => {
                        this.EmitEvents_proxymodbus_msg_get({arg: [source_name, chNum], value: [val]});
                        this.EmitEvents_logger_log({level: 'I', msg: `Message sent to ${source_name}`});
                    }).catch(() => {
                        this.EmitEvents_logger_log({level: 'E', msg: `Failed to write to modbus source ${source_name}.`, obj: 
                            require('util').inspect(arguments, {
                                depth: null
                            })});
                    })
                    break;
                case TYPE_DISC_INPUT:
                case TYPE_INPUT_REG:
                default:
                    this.EmitEvents_logger_log({level: 'E', msg: `Cannot send modbus message to ${source_name}. Unsupported type: ${dest_group.type}`, obj: dest_group});
                    break;
            }

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
        Object.values(this.#_Sockets).forEach(socket => {
            socket.end();
        });
    }
    Start() {
        let interval = {};
        Object.entries(this.#_Servers).forEach(([name, server]) => {
            if (server.groups != undefined && server.groups.length > 0) {
                server.groups.forEach((group) => {
                    switch (group.type) {
                        case TYPE_COIL:
                            server.client.readCoils(group.startReg - 1, group.numRegs).then((resp) => {
                                for (let i = 0; i < group.numRegs; i++) {
                                    this.EmitEvents_proxymodbus_msg_get({arg: [name, i + group.startReg], value: [resp.response._body._valuesAsArray[i]]});
                                    //console.log(resp.response._body._valuesAsArray[i]);
                                }
                            })
                            .catch(() => {
                                this.EmitEvents_logger_log({level: 'E', msg: `Failed to read modbus source ${name}.`, obj: 
                                    require('util').inspect(arguments, {
                                        depth: null
                                    })});
                            })
                            break;
                        case TYPE_HOLD_REG:
                            interval.name = setInterval(() => {
                                server.client.readHoldingRegisters(group.startReg, group.numRegs).then((resp) => {
                                    let i = 0;
                                    resp.response._body._valuesAsArray.forEach(val => {
                                        this.EmitEvents_proxymodbus_msg_get({arg: [name, i + group.startReg], value: [val]});
                                        i++;
                                    });
                                })
                                .catch(() => {
                                    this.EmitEvents_logger_log({level: 'E', msg: `Failed to read modbus source ${name}.`, obj: 
                                        require('util').inspect(arguments, {
                                            depth: null
                                        })});
                                    clearInterval(interval.name);
                                })
                            }, group.interval);
                            break;
                        case TYPE_DISC_INPUT:
                            server.client.readDiscreteInputs(group.startReg, group.numRegs).then((resp) => {
                                for (let i = 0; i < group.numRegs; i++) {
                                    this.EmitEvents_proxymodbus_msg_get({arg: [name, i + group.startReg], value: [resp.response._body._valuesAsArray[i]]});
                                }
                            })
                            .catch(() => {
                                this.EmitEvents_logger_log({level: 'E', msg: `Failed to read modbus source ${name}.`, obj: 
                                    require('util').inspect(arguments, {
                                        depth: null
                                    })});
                            })
                            break;
                        default:
                            break;
                    }
                })
            }
        })
    }
    /**
     * @method
     * @description Инициализирует соединение с источниками по вебсокетам
     */
    Connect() {
        let sourcesCount = 0;
        let tOut = setTimeout(() => {
            this.EmitEvents_logger_log({level: 'I', msg: `Connections done!`, obj: this.SourcesState});
            this.Start();
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach((source, index) => {
                const name = (source.DN ? source.DN : source.IP);
                this.#_Sockets[source.Name] = new net.Socket();
                this.#_Servers[source.Name] = {client: new jsModbus.client.TCP(this.#_Sockets[source.Name], index + 1),// Начинаем считать с 1
                    groups: source.Groups};
                sourcesCount++;

                this.#_Sockets[source.Name].on('connect', (event) => {
                    source.IsConnected = true;
                    source.CheckClient = true;
                    this.EmitEvents_logger_log({level: 'I', msg: `Connected to ${source.Name}`, obj: {IP: name}});
                    console.log(`Connected to ${source.Name}. IP: ${name}`)
                });

                this.#_Sockets[source.Name].on('close', (event) => {
                    this.EmitEvents_logger_log({level: 'I', msg: `Disconnected from ${source.Name}`, obj: {IP: name}});
                    source.IsConnected = false;
                    source.CheckClient = true;
                    delete this.#_Sockets[source.Name];
                });

                this.#_Sockets[source.Name].on('error', (error) => {
                    this.EmitEvents_logger_log({level: 'W', msg: `Error with ${source.Name}`, obj: {IP: name, error: error.message.toString()}});
                });

                this.#_Sockets[source.Name].connect({host: name, port: DEFAULT_PORT});
        });
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = ModbusClient;
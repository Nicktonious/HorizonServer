const ClassBaseService_S = require('srvService');
const Modbus = require('modbus-serial')

class ModbusBase extends ClassBaseService_S {
    #_Type; // Тип протокола modbus
    /**
     * @constructor
     * @description
     * Конструктор класса ModbusBase
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _name, _busNameList, _busList, _node, _type }) {
        super({ _name: _name, _busNameList: _busNameList, _busList, _node });
        this.#_Type = _type.toUpperCase();

        if (!["RTU", "TCP", "RTUOTCP"].includes(this.#_Type)) {
            this.EmitEvents_logger_log({level: 'W', msg: `Unsupported modbus client type: ${this.#_Type}\nDefaulting to TCP`});
            this.#_Type = "TCP";
        }
    }

    /**
     * @getter
     * @description Тип соединения modbus
     */
    get Type() {
        return this.#_Type;
    }

    /**
     * @method
     * @description Создаёт объект клиента modbus по указанному типу и подключает его по указанным параметрам
     * @param {Object} _opts        - объект настроек, содержит COM-порт и бодрейт для RTU соединений, или IP-адрес и порт для TCP и RTUOTCP 
     * @returns {Object} client     - объект клиента modbus-serial
     */
    Initialize_modbus_client( _opts ) {
        let client = new Modbus();
        let error = false;
        
        try {
            switch (this.#_Type) {
                case "RTU":
                    if (_opts != null && _opts.serial != null && _opts.baudrate != null) {
                        client.connectRTU(_opts.serial, {baudrate: _opts.baudrate});
                    }
                    else {
                        error = true;
                        this.EmitEvents_logger_log({level: 'W', msg: `Cannot create Modbus RTU cleint. Wrong options: ${_opts}. Specify serial and baudrate!`});
                    }
                    break;
                case "TCP":
                    if (_opts != null && _opts.ip != null && _opts.port != null) {
                        client.connectTCP(_opts.ip, { port: _opts.port });
                    }
                    else {
                        error = true;
                        this.EmitEvents_logger_log({level: 'W', msg: `Cannot create Modbus TCP cleint. Wrong options: ${_opts}. Specify ip and port!`});
                    }
                    break;
                case "RTUOTCP":
                    if (_opts != null && _opts.ip != null && _opts.port != null) {
                        client.connectTelnet(_opts.ip, { port: _opts.port });
                    }
                    else {
                        error = true;
                        this.EmitEvents_logger_log({level: 'W', msg: `Cannot create Modbus RTUOTCP cleint. Wrong options: ${_opts}. Specify ip and port!`});
                    }
                    break;
                default:
                    error = true;
                    this.EmitEvents_logger_log({level: 'W', msg: `Unknown modbus client type: ${this.#_Type}`});
                    break;
            }
        }
        catch (e) {
            error = true;
            this.EmitEvents_logger_log({level: 'W', msg: `Error creating Modbus ${this.#_Type} cleint. Message: ${e.message}`});
        }
        client._port._client.setKeepAlive(true, 0);
        client.on('close', (err) => {
            this.Reopen();
        });
        client.on('error', (err) => {
            this.Reopen();
            //console.log("I error");
            //console.log(err);
        });
        client.on('timeout', () => {
            this.Reopen();
            //console.log("I idle");
        });
        
        

        if (error) return undefined;
        else return client;
    }

    /**
     * @method
     * @description Выполняет команду modbus для указанного клиента из очереди
     * @param {Integer} _com    - номер команды modbus
     * @param {Integer} _reg    - номер адресуемого регистра
     * @param {Array} _dat      - массив значений для записи
     * @param {Integer} _len    - количество регистров при чтении
     * @param {Object} _mbclient- объект клиента modbus-serial, на который посылается команда 
     * @returns {Promise}       - промис для дальнейшей обработки очереди
     */
    Execute_modbus_command( _id, _reg, _dat, _len, _mbclient )
    {
        _id = _id || 0x03;
        _reg = _reg || 0;
        _dat = _dat ?? 0;
        _len = _len || 1;

        return new Promise((res,rej) => {
            switch (_id) {
                case 0x01: // Чтение DO (Coils)
                    _mbclient.readCoils(_reg, _len)
                    .then((data) => {
                        res(data);
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x02: // Чтение DI (Discrete Input)
                    _mbclient.readDiscreteInputs(_reg, _len)
                    .then((data) => {
                        res(data);
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x03: // Чтение AO (Holding Registers)
                    _mbclient.readHoldingRegisters(_reg, _len)
                    .then((data) => {
                        res(data);
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x04: // Чтение AI (Analog Inputs)
                    _mbclient.readInputRegisters(_reg, _len)
                    .then((data) => {
                        res(data);
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x05: // Запись одного DO
                    _mbclient.writeCoil(_reg, _dat)
                    .then(() => {
                        res({data: [_dat], buffer: new Int16Array(_dat).buffer});
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x06: // Запись одного AO
                    _mbclient.writeRegister(_reg, _dat)
                    .then(() => {
                        res({data: [_dat], buffer: new Int16Array(_dat).buffer});
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x0F: // Запись нескольких DO
                    _mbclient.writeCoils(_reg, _dat)
                    .then(() => {
                        res({data: _dat, buffer: new Int16Array(_dat).buffer});
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;
                case 0x10: // Запись нескольких AO
                    _mbclient.writeRegisters(_reg, _dat)
                    .then(() => {
                        res({data: _dat, buffer: new Int16Array(_dat).buffer});
                    })
                    .catch((err) => {
                        rej(err);
                    })
                    break;            
                default:
                    rej(`Unsupported command: ${_com}`);
                    break;
            }
        })
    }

    /**
     * @method
     * @description Формирует очередь команд modbus для индивидуального клиена
     * @param {Object} _client      - объект, содержищий уникальные флаги и объект клиента modbus-serial 
     * @param {Object} _comm        - объект, содержащий данные об исполняемой команде 
     * @param {Function} _cb        - функция, которая должна будет выполнится при завершении выполнения команды
     * @returns 
     */
    Queue_client_command( _client, _comm, _cb ) {
        if (_client.isOccupied) {// заняты - кладём в очередь
            _client.commQueue.push([_client, _comm, _cb]);
            return;
        }

        _client.isOccupied = true;
        let cbTOut = setTimeout(() => {
            _client.isOccupied = false;
            _cb();
            if (_client.commQueue.length > 0) 
                this.Queue_client_command.apply(this, _client.commQueue.shift());
        }, 3000);// ждём 3 секунды, иначе считаем, что произошла ошибка или обрыв связи

        _client.mbclient.setID(_comm.mbID);
        this.Execute_modbus_command (_comm.id, _comm.reg, _comm.dat, _comm.len, _client.mbclient)
        .then((data) => {
            clearTimeout(cbTOut);
            _cb(data);
            _client.isOccupied = false;
            if (_client.commQueue.length > 0) 
                this.Queue_client_command.apply(this, _client.commQueue.shift());
        })
        .catch((err) => {
            this.EmitEvents_logger_log({level: 'E', msg: `Error sending modbus command: ${err}`, obj: _comm});
            _cb();
            _client.isOccupied = false;
            if (_client.commQueue.length > 0) 
                this.Queue_client_command.apply(this, _client.commQueue.shift());
        })
    }
}

module.exports = ModbusBase;
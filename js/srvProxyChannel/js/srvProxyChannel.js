const ClassBaseService_S = require('srvService');

const EVENT_SYSBUS_LIST = ['all-init-stage1-set'];
const EVENT_DATABUS_LIST = ['all-data-fine-set'];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'dataBus'];
/**
 * @class
 * Класс предоставляет инструменты для логирования 
 */
class ClassProxyChannel extends ClassBaseService_S {
    #_SubChannels = [];
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: 'proxychannel', _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('dataBus', EVENT_DATABUS_LIST);

        this.EmitEvents_logger_log({level: 'INFO', msg: 'Proxy channel initialized.'});
    }
    /**
     * @method
     * @description
     * Получает объект Node-RED через которую передаются сообщения из логгера
     * @param {Object} _opts     - Объект с информацие для подписки   
     */
    Subscribe(_opts) {
        if (!this.ServicesState) {
            const resp = {payload: {
                dest: 'chio',
                com: 'chio-not-ready',
                arg: [],
                value: [`Cannot subscribe ${_opts.chName}. System startup in process`]
                },
                topic: 'Subscribtion error'
            };
            _opts.node.send(resp);
            return;
        }
        if (typeof (this.#_SubChannels.find(channel => channel.node == _opts.node)) !== 'undefined') {
            const resp = {payload: {
                dest: 'chio',
                com: 'chio-already-subbed',
                arg: [],
                value: [`Node ${_opts.node.name} already subscribed!`]
                },
                topic: 'Subscribtion error'
            };
            _opts.node.send(resp);
            return;
        }
        if (!(_opts.chName in this.ServicesState)) {
            const resp = {payload: {
                dest: 'chio',
                com: 'chio-no-channel',
                arg: [],
                value: [`Channel with name ${_opts.chName} doesn't exist!`]
                },
                topic: 'Subscribtion error'
            };
            _opts.node.send(resp);
            return;
        }
        if (this.ServicesState[_opts.chName].Status !== 'running') {
            const resp = {payload: {
                dest: 'chio',
                com: 'chio-not-running',
                arg: [`Status: ${this.ServicesState[_opts.chName].Status}`],
                value: [`Channel ${_opts.chName} isn't running!`]
                },
                topic: 'Subscribtion error'
            };
            _opts.node.send(resp);
            return;
        }
        this.#_SubChannels.push(_opts);
        this.EmitEvents_logger_log({level: 'INFO', msg: `${_opts.node.name} subscribed`});
        const resp = {payload: {
            dest: 'chio',
            com: 'chio-success',
            arg: [`Status: ${this.ServicesState[_opts.chName].Status}`],
            value: [`Channel ${_opts.chName} subscribed!`]
            },
            topic: 'Subscribtion success'
        };
        _opts.node.send(resp);
    }
     /**
     * @method
     * @description
     * Метод для управления каналами актуаторов
     * @param {Object} _opts     - Объект с именем канала и значением, которое нужно установить   
     */
    Control(_opts) {
        if (_opts.chName == undefined && _opts.node) {
            _opts.chName = this.#_SubChannels.find(channel => channel.node === _opts.node).chName;
        }
        if (!(_opts.chName in this.ServicesState)) {
            this.EmitEvents_logger_log({level: 'W', msg: `Cannot set value: Channel ${_opts.chName} doesn't exist!`});
            return;
        }

        const msg = {
            com: 'all-actuator-set',
            dest: _opts.chName,
            source: 'Node-RED',            
            arg: [_opts.chName],
            value: [_opts.Value]
        };
        this.EmitMsg('dataBus', msg.com, msg);
    }
    GetValue(_chName) {
        return this.ServicesState[_chName].Service.Value;
    }
    /**
     * @method
     * @description
     * Получает сообщение от канала и перенаправляет его на соответствующий узел Node-RED
     * @param {Object} _msg      - Объект сообщения с канала
     */
    HandlerEvents_all_data_fine_set(_topic, _msg) {
        this.#_SubChannels.forEach(channel => {
            if (channel.chName == _msg.arg[0]) {
                let retVal = [];
                Object.keys(_msg.value[0]).forEach(key => {
                    if (channel.ret.includes(key)) {
                        retVal.push(_msg.value[0][key]);
                    }
                });
                const msg = {payload: {
                    dest: channel.node.name,
                    com: 'chio-output',
                    arg: channel.ret,
                    value: retVal
                    },
                    topic: channel.chName
                };
                channel.node.send(msg);
            }
        });
    }
}
module.exports = ClassProxyChannel;
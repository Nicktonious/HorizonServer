const ClassBaseService_S = require('../../js/srvService/js/srvService');
const EventEmitter = require('eventemitter2');

const EVENT_SYSBUS_LIST = ['all-init-stage1-set'];
const EVENT_DATABUS_LIST = ['all-data-fine-set', 'all-ch-new', 'all-ch-status-get'];
const BUS_NAMES_LIST = ['sysBus', 'logBus', 'dataBus'];

/**
 * @class
 * Класс предоставляет инструменты для взаимодействия с каналами через dataBus в тестах
 */
class ClassProxyChannel extends ClassBaseService_S {
    #_SubChannels = [];
    #_Channels = [];
    #_Events = {};

    /**
     * @constructor
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: 'proxychannel', _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('dataBus', EVENT_DATABUS_LIST);
        this.#_Events = new EventEmitter();

        this.EmitEvents_logger_log({ level: 'INFO', msg: 'Proxy channel initialized.' });
    }

    get Channels() {
        return this.#_Channels;
    }

    get Events() {
        return this.#_Events;
    }

    /**
     * @method
     * @description 
     * Получение текущего значения указанного канала
     * @param {String} _chName - имя канала
     * @returns {Object} val - значение указанного канала
     */
    GetValue(_chName) {
        return this.ServicesState?.[_chName]?.Service?.Value;
    }

    /**
     * @method
     * @description
     * Установка значения указанного канала (актуатора)
     * @param {String} _chName - имя канала 
     * @param {Object} _val - записываемое значение
     */
    SetValue(_chName, _val) {
        if (_chName == undefined) {
            this.EmitEvents_logger_log({ level: 'W', msg: `Cannot set value: Channel ${_chName} doesn't exist!` });
            return;
        }
        const msg = {
            com: 'all-actuator-set',
            dest: _chName,
            source: 'Node-RED',            
            arg: [_chName],
            value: [_val]
        };
        this.EmitMsg('dataBus', msg.com, msg);
    }

    /**
     * @method
     * @description
     * Установка статуса канала (включение / выключение)
     * @param {string} _chName - имя канала
     * @param {boolean|string|object} _status - статус (true/false, 'active'/'inactive' или { enabled })
     */
    SetChannelStatus(_chName, _status) {
        if (_chName == undefined) {
            this.EmitEvents_logger_log({ level: 'W', msg: `Cannot set status: Channel ${_chName} undefined!` });
            return;
        }
        const msg = {
            com: 'all-ch-status-set',
            dest: _chName,
            source: 'proxychannel',
            arg: [_chName],
            value: [_status]
        };
        this.EmitMsg('dataBus', msg.com, msg);
    }

    /**
     * @method
     * @description
     * Запрос текущего статуса канала
     * @param {string} _chName - имя канала
     */
    GetChannelStatus(_chName) {
        if (_chName == undefined) return;
        const msg = {
            com: 'all-ch-status-get',
            dest: _chName,
            source: 'proxychannel',
            arg: [_chName]
        };
        this.EmitMsg('dataBus', msg.com, msg);
    }

    /**
     * @method
     * @description
     * Получает сообщение от созданного канала и сохраняет его характеристики
     * @param {string} _topic
     * @param {Object} _msg - Объект сообщения
     */
    HandlerEvents_all_ch_new(_topic, _msg) {
        let [ch] = _msg.value;
        if (!ch || !ch?.Name) return;

        if (!this.#_Channels.includes(ch.Name)) {
            this.#_Channels.push(_msg.value[0]);
        } else {
            this.EmitEvents_logger_log({ level: 'W', msg: `Channel ${_msg.value.Name} already added to proxy channel array` });
        }
    }

    /**
     * @method
     * @description
     * Получает сообщение от канала и перенаправляет его на соответствующий узел Node-RED
     * @param {string} _topic
     * @param {Object} _msg - Объект сообщения с канала
     */
    HandlerEvents_all_data_fine_set(_topic, _msg) {
        this.#_Events.emit(`${_msg.arg[0]}-value`, _msg.value[0]);
        this.#_SubChannels.forEach(channel => {
            if (channel.chName == _msg.arg[0]) {
                let retVal = [];
                channel.ret.forEach(key => {
                    if (Object.keys(_msg.value[0]).includes(key)) {
                        retVal.push(_msg.value[0][key]);
                    }                    
                });
                const msg = {
                    payload: {
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

    /**
     * @method
     * @description
     * Обработчик входящего статуса канала с dataBus
     * @param {string} _topic 
     * @param {object} _msg 
     */
    HandlerEvents_all_ch_status_get(_topic, _msg) {
        const chName = _msg?.arg?.[0];
        const status = _msg?.value?.[0];
        if (chName) {
            this.#_Events.emit(`${chName}-status`, status);
            this.#_Events.emit('channel-status', { channel: chName, status });
        }
    }

    /**
     * @method
     * @description
     * Очистка ресурсов службы
     */
    HandlerEvents_all_close(_topic, _msg) {
        super.HandlerEvents_all_close?.(_topic, _msg);
        this.#_Events?.removeAllListeners?.();
    }
}

module.exports = ClassProxyChannel;

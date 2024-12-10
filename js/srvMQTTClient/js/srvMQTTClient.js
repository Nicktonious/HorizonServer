const ClassBaseService_S = require('srvService');
const mqtt = require('mqtt');

const COM_MQTTC_SEND = 'mqttclient-send';
const COM_MQTTC_SUB  = 'mqttclient-sub';
const COM_PMQTTC_MSG_GET = 'proxymqttclient-msg-get';

const COM_ALL_CONNS_DONE = 'all-connections-done';

// ### СПИСКИ ТОПИКОВ
const EVENT_ON_LIST_SYSBUS = ['all-init-stage1-set', 'all-close'];
const EVENT_ON_LIST_MQTTBUS = [COM_MQTTC_SEND, COM_MQTTC_SUB];

class ClassMQTTClient_S extends ClassBaseService_S {
    #_Clients = [];
    constructor({ _busList, _node }) {
        super({ _name: 'mqttclient', _busNameList: ['sysBus', 'mqttBus', 'logBus'], _busList, _node });
        this.FillEventOnList('sysBus', EVENT_ON_LIST_SYSBUS);
        this.FillEventOnList('mqttBus', EVENT_ON_LIST_MQTTBUS);
    }

    async HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        this.#EstablishConnections();
    }
    /**
     * @method
     * @public
     * @description Устанавливает обходит подключения с доступными источниками.
     * Созданные клиенты сохраняются в поле #_Clients. 
     */
    async #EstablishConnections() {
        // отбор источников, к которым будет попытка подключения
        const mqtt_sources = Object.values(this.SourcesState)
            .filter(_source => !_source.IsConnected && _source.Protocol === 'mqtt');
        // получение списка промисов-оберток над подключением к каждому источнику
        const connect_result = await Promise.all(mqtt_sources.map(_source => {
            return this.#CreateConnection(_source);
        }));
        // перебор удачных/неудачных подключений
        connect_result.forEach((_conn, _i) => {
            // объект источника из SourcesState, соответствующий объекту подключения
            const source = mqtt_sources[_i];
            this.#_Clients[source.Name] = _conn;
            // обновление флага источника
            source.IsConnected = true;
            // установка обработчиков на события
            this.#SetConnectionHandlers(this.#_Clients[source.Name], source);
        });
    }
    /**
     * @method
     * @public
     * @description Выполняет подписку на указанный топик брокера.
     * @param {string} _topic 
     * @param {*} _msg 
     */
    async HandlerEvents_mqttclient_sub(_topic, _msg) {
        // { arg: 'brokerName',  value: [topicName1, topicName2, ...] }
        const source_name = _msg.arg[0];
        const topic_list = _msg.value;
        await this.#_Clients[source_name]?.subscribe(topic_list);
    }
    /**
     * @method
     * @public
     * @description Принимает сообщение и отправляет его на брокер
     * @param {string} _topic 
     * @param {ClassBusMsg} _msg 
     */
    HandlerEvents_mqttclient_send(_topic, _msg) {
        // { arg: 'brokerName',  value: [topicName, payload] }
        const source_name = _msg.arg[0];
        const [topicName, payload] = _msg.value;
        const client = this.#_Clients.find(_client => _client.Name === source_name);
        client.publishAsync(topicName, payload);
    }
    /**
     * @method
     * @public
     * @description Создает объект подключения
     * @param {} _source 
     * @returns 
     */
    #CreateConnection(_source) {
        return new Promise(async (res, rej) => {
            let host = `mqtt://${(_source.IP) ? _source.IP : _source.DN}`;
            let options = {
                port: _source.Port,
                username: _source.Login,
                password: _source.Password
            }
            try {
                const connection = await mqtt.connectAsync(host, options);
                // TODO: специфицировать настройки подключения
                res(connection);
            } catch (e) {
                this.EmitEvents_logger_log({ msg: `Error trying connect to ${url}`, level: 'E', obj: e});
                res(null);
            }
        });
    }
    /**
     * @method
     * @private
     * @description Устанавливает обработчики на события подключения
     * @param {mqtt.MqttClient} _connection 
     * @param {*} _source 
     */
    #SetConnectionHandlers(_connection, _source) {
        _connection.on('message', (_topic, _payload) => {
            this.EmitEvents_proxymqttclient_msg_get({ 
                arg: [_source.Name], value: [_topic, _payload]
            });
        }); 
        _connection.on('connect', () => {
            _source.IsConnected = true;
        });
        _connection.on('close', () => {
            _source.IsConnected = false;
        });
    }
    /**
     * @method
     * @public
     * @description Отправляет на mqttBus сообщение с данными от брокера
     */
    EmitEvents_proxymqttclient_msg_get({ arg, value }) {
        const msg = {
            dest: 'proxymqttclient',
            com: COM_PMQTTC_MSG_GET,
            arg,
            value
        }
        this.EmitMsg('mqttBus', msg.com, msg);
    }
    /**
     * @method
     * @public
     * @description Отправляет на sysBus сообщение о готовности подключений
     */
    EmitEvents_all_connections_done() {
        this.EmitMsg('sysBus', COM_ALL_CONNS_DONE, {
            com: COM_ALL_CONNS_DONE,
            dest: 'dm'
        });
    }
}

module.exports = ClassMQTTClient_S;
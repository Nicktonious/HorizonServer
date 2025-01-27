/**
 * @typedef TypeConnRes
 * @property {object} source
 * @property {mqtt.MqttClient} client
 */
const ClassBaseService_S = require('./srvService');
const mqtt = require('mqtt');

const COM_ALL_INIT1 = 'all-init-stage1-set';
const COM_MQTTC_SEND = 'mqttclient-send';
const COM_MQTTC_SUB  = 'mqttclient-sub';
const COM_PMQTTC_MSG_GET = 'proxymqttclient-msg-get';

const COM_ALL_CONNS_DONE = 'all-connections-done';
const COM_ALL_DISCONN = 'all-source-disconnected';

// ### СПИСКИ ТОПИКОВ
const EVENT_ON_LIST_SYSBUS = [COM_ALL_INIT1, 'all-close'];
const EVENT_ON_LIST_MQTTBUS = [COM_MQTTC_SEND, COM_MQTTC_SUB];

class ClassMQTTClient_S extends ClassBaseService_S {
    #_Clients = {};
    constructor({ _busList, _node }) {
        super({ _name: 'mqttclient', _busNameList: ['sysBus', 'mqttBus', 'logBus'], _busList, _node });
        this.FillEventOnList('sysBus', EVENT_ON_LIST_SYSBUS);
        this.FillEventOnList('mqttBus', EVENT_ON_LIST_MQTTBUS);
    }

    get ConnectedNames() {
        // отбор источников, к которым будет попытка подключения    
        return Object.entries(this.#_Clients)
            .filter(([_name, _client]) => _client.connected)
            .map(([_name, _client]) => _name);
    }

    get MQTTSources() {
        return Object.values(this.SourcesState)
            .filter(_source => !_source.IsConnected && _source.Protocol === 'mqtt');
    }

    async HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);
        // connect_result == [... { source, client }]
        const connect_result = await this.#EstablishConnections();
        // перебор удачных подключений
        connect_result
        .filter(({ source, client }) => client?.connected)
        .forEach(({ source, client }) => {
            // объект источника из SourcesState, соответствующий объекту подключения
            source.CheckClient = true;
            this.#_Clients[source.Name] = client;
            // обновление флага источника
            source.IsConnected = true;
            // установка обработчиков на события
            this.#SetConnectionHandlers(client, source);
        });
        // сообщение о готовности если успешных подключений > 0
        if (connect_result.length)
            this.EmitEvents_all_connections_done({ arg: this.ConnectedNames });
    }
    /**
     * @method
     * @public
     * @description Устанавливает обходит подключения с доступными источниками.
     * Созданные клиенты сохраняются в поле #_Clients. 
     * @returns {Promise}
     */
    async #EstablishConnections() {
        // получение списка промисов-оберток над подключением к каждому источнику
        return Promise.all(this.MQTTSources.map(_source => {
            return this.#CreateConnection(_source);
        }));
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
        this.EmitEvents_logger_log({ msg: `mqttclient subscribe on ${topic_list}`, level: 'I', obj: topic_list });
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
        const payload_str = JSON.stringify(payload);
        const client = this.#_Clients[source_name];
        client.publishAsync(topicName, payload_str);
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
            let options = Object.assign({
                port:     _source.Port,
                username: _source.Login,
                password: _source.Password,
            }, _source.ConnectOpts);
            options.protocol ??= 'mqtt'; //по умолчанию mqtt://

            let url = `${options.protocol}://${(_source.IP) ? _source.IP : _source.DN}`;

            try {
                const connection = await mqtt.connectAsync(url, options);
                res({ source: _source, client: connection });
            } catch (e) {
                this.EmitEvents_logger_log({ msg: `Error trying connect to ${url}`, level: 'E', obj: e});
                res({ source: _source, client: null });
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
        _connection.on('message', (_topic, _payloadBuffer) => {
            this.EmitEvents_proxymqttclient_msg_get({ 
                arg: [_source.Name], value: [_topic, _payloadBuffer.toString()]
            });
        }); 
        _connection.on('connect', () => {
            _source.IsConnected = true;
            this.EmitEvents_logger_log({ msg: `MQTT connected ${_connection?.options?.clientId}`, lvl: 'E', obj: e });
        });
        _connection.on('close', () => {
            _source.IsConnected = false;
            this.EmitEvents_all_source_disconnected({ arg: [_source.Name] });
            this.EmitEvents_logger_log({ msg: `MQTT connection ${_connection?.options?.clientId} closed`, lvl: 'E', obj: e });
        });
        _connection.on('error', e => {
            _source.IsConnected = false;
            this.EmitEvents_all_source_disconnected({ arg: [_source.Name] });
            this.EmitEvents_logger_log({ msg: `Error occurred with MQTT connection ${_connection?.options?.clientId}`, lvl: 'E', obj: e });
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
    EmitEvents_all_connections_done({ arg=[] }) {
        this.EmitMsg('sysBus', COM_ALL_CONNS_DONE, {
            dest: 'dm',  
            com: COM_ALL_CONNS_DONE,
            arg
        });
    }
    /**
     * @method
     * @public
     * @description Отправляет на sysBus сообщение о разрыве соединения
     */
    EmitEvents_all_source_disconnected({ arg }) {
        this.EmitMsg('sysBus', COM_ALL_DISCONN, {
            dest: 'dm',  
            com: COM_ALL_DISCONN,
            arg
        });
    }
}

module.exports = ClassMQTTClient_S;
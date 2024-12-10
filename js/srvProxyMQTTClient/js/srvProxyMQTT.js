const ClassBaseService_S = require('srvService');

const COM_DM_DEVLIST_GET        = 'dm-deviceslist-get';
const COM_PMQTTC_DEVLIST_GET    = 'proxymqttclient-deviceslist-get';
const COM_MQTTC_SEND            = 'mqttclient-send';
const COM_ALL_DATA_RAW_GET      = 'all-data-raw-get';

const BUS_NAME_LIST = ['sysBus', 'mqttBus', 'logBus'];
const EVENT_ON_LIST_MQTTBUS = ['proxymqttclient-send', 'proxymqttclient-msg-get'];

const DEBUG_SRC_NAME = 'brokerhubc445';
const DUBUG_DEVLIST = { 
    sensor: ['7d60-42b3-19b7-03db-00-0'],
    actuator: ['8654-61b3-1ede-51ac-01-0']
}   

class ClassProxyMQTTClient_S extends ClassBaseService_S {
    #_SensSubList = { };
    constructor({ _busList, _node }) {
        // передача в супер-конструктор имени службы и списка требуемых шин
        super({ _name: 'proxymqttclient', _busNameList: BUS_NAME_LIST, _busList, _node });
        this.FillEventOnList('mqttBus', EVENT_ON_LIST_MQTTBUS);
    }

    HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        Object.keys(this.SourcesState)
            .filter(_source => _source.Protocol === 'mqtt')  
            .forEach(_source => {
                _source.CheckProxy = true;
            });
    }
    /**
     * @method
     * @public
     * @description Отправляет службе mqttclient топик и значение, которое требуется записать
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymqttclient_send(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        const { source }    = _msg.metadata;
        const [ payload ]   = _msg.value;
        const topic_name = this.#_SensSubList[source_name]?.find(_obj => _obj.name === source);
        
        const msg_is_valid = typeof topic_name === 'string' && payload;
        if (msg_is_valid) {  
            this.EmitEvents_mqttclient_send({ arg: _msg.arg, value: [topic_name, payload ]});       
        }
    }
    /**
     * @method
     * @public
     * @description Принимает запрос на получение списка каналов источника
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymqttclient_deviceslist_get(_topic, _msg) {
        // const [ source_name ] = _msg.arg;
        const { hash } = _msg.metadata;
        this.EmitEvents_dm_deviceslist_set({ hash, arg: _msg.arg });
    }

    /**
     * @method
     * @public
     * @description Сохраняет информацию, необходимую для сопоставления топиков и имен служб-каналов.
     * Отправляет на mqttclient команду подписаться на полученные топики  
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymqttclient_sub_sensorall(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        // [ { name, address }, ... ]
        const [ ch_list ] = _msg.value;
        ch_list.forEach(_mappingObj => {
            this.#_SensSubList[source_name] ??= []; 
            this.#_SensSubList[source_name].push(_mappingObj);
        });
        const topic_list = ch_list?.map(_obj => _obj.address);
        if (Array.isArray(topic_list) && topic_list.length)
            this.EmitEvents_mqttclient_sub({ arg: _msg.arg, value: topic_list })
    }
    /**
     * @method
     * @public
     * @description Принимает имя топика и сообщение с брокера.
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxymqttclient_msg_get(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        const [ topic_name, payload ] = _msg.value;
        
        const ch_name = this.#_SensSubList[source_name]
            ?.find(_obj => _obj.address === topic_name)?.name;
        if (ch_name) {
            const msg = {
                dest: ch_name,
                com: COM_ALL_DATA_RAW_GET,
                arg: [source_name],
                value: [{
                    com: COM_ALL_DATA_RAW_GET,
                    arg: [ch_name],
                    value: [parseFloat(payload)]
                }]
            }
            this.EmitMsg('mqttBus', msg.com, msg);
        }
    }
    /**
     * @method
     * @public
     * @description Отправляет на службу-клиент команду выполнить подписку на топик
     * @param {} param0 
     * @returns 
     */
    EmitEvents_mqttclient_sub({ arg, value }) {
        const msg = {
            dest: 'mqttclient',
            com: 'mqttclient-sub',
            arg,
            value
        }
        return this.EmitMsg('mqttBus', msg.com, msg);
    }
    /**
     * @method
     * @public
     * @description Отправляет на dm список каналов
     * @param {*} param0 
     */
    EmitEvents_dm_deviceslist_set({ arg, hash }) {
        const msg = {
            dest: 'dm',
            hash,
            com: COM_DM_DEVLIST_GET,
            arg,
            value: [{
                dest: 'dm',
                com: COM_DM_DEVLIST_GET,
                value: [ DUBUG_DEVLIST ]
            }]
        }
        this.EmitMsg('mqttBus', msg.com, msg);
    }
    /**
     * @method
     * @public
     * @description Отправляет на MQTT Client запрос на отправку сообщения на брокер
     * @param {*} param0 
     */
    EmitEvents_mqttclient_send({ arg, value }) {
        const msg = {
            dest: 'mqttclient',
            com: COM_MQTTC_SEND,
            arg,
            value
        }
        this.EmitMsg('mqttBus', msg.com, msg);
    }
}

module.exports = ClassProxyMQTTClient_S;
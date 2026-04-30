const ClassBaseService_S = require('./../../srvService/js/srvService');

const DEVICELIST_REQ_TIMEOUT = 3000;

const COM_DM_DEVLIST_SET     = 'dm-deviceslist-set';
const COM_PMQTTC_DEVLIST_GET = 'proxymqttclient-deviceslist-get';
const COM_SUB_SENSALL      = 'proxymqttclient-sub-sensorall';
const COM_PMQTTC_SEND      = 'proxymqttclient-send';
const COM_PMQTTC_MSG_GET   = 'proxymqttclient-msg-get';
const COM_MQTTC_SEND       = 'mqttclient-send';
const COM_ALL_DATA_RAW_GET = 'all-data-raw-get';

const BUS_NAME_LIST = ['sysBus', 'mqttBus', 'logBus'];
const EVENT_ON_LIST_MQTTBUS = [COM_PMQTTC_DEVLIST_GET, COM_SUB_SENSALL, COM_PMQTTC_SEND, COM_PMQTTC_MSG_GET];

const channels_dummy = require('./Channels');
const get_devlist = (_sourceName) => {
    let list = { sensor: [], actuator: [] }
    channels_dummy
        .filter(_ch => _ch.ChStatus == 'active' && _ch.SourceName == _sourceName)
        .forEach(_ch => {
            // let ch_note = `${_ch.DeviceIdHash}-${_ch.DeviceId}-${_ch.ChNum}`;
            list[_ch.ChType].push(_ch.Name);
        });
    return list;
};

/**
 * @typedef MappingListDevice
 * @description Запись об одном канале: его name и address 
 * @property {string} name
 * @property {string} address
 */
/**
 * @typedef MappingList
 * @description Маппинг-таблица для сопоставления топика (address) с именем канала сенсора/актуатора (name) 
 * @property {[MappingListDevice]} sensor 
 * @property {[MappingListDevice]} actuator
 */
/**
 * @typedef SubSensorallMsg
 * @property {[string]} arg - [source_name]
 * @property {[MappingList]} value
 */
/**
 * @typedef Z2MDIEndpointDesc
 * @property {[]} bindings
 * @property {} configured_reportings
 * @property {} clusters
 */
/**
 * @typedef Z2MDIDefinition
 * @property {string} model     :"ZNCZ02LM",
 * @property {string} vendor        :"Xiaomi",
 * @property {string} description       :"Mi power plug ZigBee",
 * @property {[]} options       : [...], // see exposes/options below
 * @property {[]} exposes       : [...]  // see exposes/options below
 */
/**
 * @typedef Z2MDeviceInfo
 * @property {string} ieee_address       ":"0x00158d00018255df",
 * @property {string} type       ":"Router",
 * @property {number} network_address        ":29159,
 * @property {boolean} supported      ":true,
 * @property {boolean} disabled       ": false,
 * @property {string} friendly_name      ":"my_plug",
 * @property {string} description        ":"this plug is in the kitchen",
 * @property {} endpoints      ":{"1":{"bindings":[],"configured_reportings":[],"clusters":{"input":["genOnOff","genBasic"],"output":[]}}},
 * @property {Z2MDIDefinition} definition     
 * @property {string} power_source       :"Mains (single phase)",
 * @property {string} date_code      :"02-28-2017",
 * @property {string} model_id       :"lumi.plug",
 * @property {} scenes     : [{"id": 3, "name": "Chill scene"}],
 * @property {boolean} interviewing       :false,
 * @property {boolean} interview_completed        :true
 */

class ClassProxyZ2MClient_S extends ClassBaseService_S {
    #_SensSubList = { };
    #_Endpoints = null;
    #_ReqList = [];

    constructor({ _busList, _node }) {
        // передача в супер-конструктор имени службы и списка требуемых шин
        super({ _name: 'proxyz2mclient', _busNameList: BUS_NAME_LIST, _busList, _node });
        this.FillEventOnList('mqttBus', EVENT_ON_LIST_MQTTBUS);
        
        this.#_Endpoints = this.TEMP_GetEndpointList(channels_dummy);
    }

    HandlerEvents_all_init_stage1_set(_topic, _msg) {
        super.HandlerEvents_all_init_stage1_set(_topic, _msg);

        Object.keys(this.SourcesState)
            .filter(_source => _source.Protocol === 'z2m')  
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
        const [ value ]   = _msg.value;
        const [ payload ] = value.value;
        const topic_name = this.#_SensSubList[source_name]?.find(_obj => _obj.name === source).address;
        
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
    HandlerEvents_proxyz2mclient_deviceslist_get(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        const { hash } = _msg.metadata;
        this.#_ReqList.push({ hash, com: 'zigbee2mqtt/bridge/request/devices', source: source_name });
        setTimeout(() => {
            const i = this.#_ReqList.findIndex(_o => _o.hash == hash);
            if (i > -1) this.#_ReqList.splice(i);
            // TODO: add logging maybe
        }, DEVICELIST_REQ_TIMEOUT);
        this.EmitEvents_mqttclient_send({ hash, arg: _msg.arg, value: ['zigbee2mqtt/bridge/request/devices', '{}'] });
    }

    /**
     * @method
     * @public
     * @description Сохраняет информацию, необходимую для сопоставления топиков и имен служб-каналов.
     * Отправляет на mqttclient команду подписаться на полученные топики  
     * @param {string} _topic 
     * @param {SubSensorallMsg} _msg 
     */
    HandlerEvents_proxymqttclient_sub_sensorall(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        /* ch_list = { sensor: [{ name, address }, ...], actuator: { ... } ] */

        const [ { sensor=[], actuator=[] } ] = _msg.value;
        const aggr_ch_map_list = [...sensor, ...actuator];
        const topic_list = [];
        aggr_ch_map_list.forEach(_mappingObj => {
            this.#_SensSubList[source_name] ??= []; 
            this.#_SensSubList[source_name].push(_mappingObj);
            topic_list.push(_mappingObj.address);
        });
        if (topic_list.length) {
            this.EmitEvents_logger_log({ msg: `Channels mapping with MQTT addresses: ${aggr_ch_map_list}`, level: 'I', obj: aggr_ch_map_list});
            // подписка на адреса каналов-сенсоров 
            this.EmitEvents_mqttclient_sub({ arg: _msg.arg, value: sensor.map(_s => _s.address) });
        } else {
            this.EmitEvents_logger_log({ msg: `No MQTT address or channel to complete mapping`, level: 'I', obj: aggr_ch_map_list}); 
        }
    }
    /**
     * @method
     * @public
     * @description Принимает имя топика и сообщение с брокера.
     * @param {string} _topic 
     * @param {*} _msg 
     */
    HandlerEvents_proxyz2mclient_msg_get(_topic, _msg) {
        const [ source_name ] = _msg.arg;
        const [ topic_name, payload ] = _msg.value;
        
        const ch_name_list = this.#_SensSubList[source_name]?.filter(_obj => _obj.address === topic_name);

        if (ch_name_list.length) {
            ch_name_list.forEach(_name =>  {
                this.EmitEvents_all_data_raw_get({ dest: _name, arg: [source_name], value: [payload] });
            });
        } else {
            // перенаправление логов 
            if (topic_name == 'zigbee2mqtt/bridge/logging') {
                let z2m_log_msg =  JSON.parse(payload);
                this.EmitEvents_logger_log({ msg:  z2m_log_msg.message, level: 'I', obj: z2m_log_msg });
            }
            if (topic_name == 'zigbee2mqtt/bridge/devices') {
                const { hash } = this.#_ReqList.find(_o => _o.com == 'zigbee2mqtt/bridge/request/devices' && _o.metadata.source == source_name);
                // TODO фильтровать devlist
                this.EmitEvents_dm_deviceslist_set({ hash, arg: [source_name], value: [get_devlist(source_name)] });
            }
        }
    }
    /**
     * @method
     * @description Отправляет 'all-data-raw-get' сообщение на mqttBus
     * @param {*} param0 
     */
    EmitEvents_all_data_raw_get({ dest, arg, value }) {
        const endpoint = this.#_Endpoints[_name] ?? 'default';
        const msg = {
            dest,
            com: COM_ALL_DATA_RAW_GET,
            arg: arg,
            value: [{
                com: COM_ALL_DATA_RAW_GET,
                arg: [dest],
                value: value
            }]
        }
        this.EmitMsg('mqttBus', msg.com, msg);
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
    EmitEvents_dm_deviceslist_set({ arg, value, hash }) {
        const msg = {
            dest: 'dm',
            hash,
            com: COM_DM_DEVLIST_SET,
            arg,
            value: [{
                dest: 'dm',
                com: COM_DM_DEVLIST_SET,
                value: value
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
    /**
     * @method
     * @description Добавляет в маппинг таблицу указания endpoint'ов соответствующих каналов 
     * @param {[]} _chList
     */
    TEMP_GetEndpointList(_chList) {
        _chList.reduce((curr, prev) => {
            prev[curr.Name] = _ch.ChNum;
            return prev;
        }, {});
    }
}

module.exports = ClassProxyZ2MClient_S;
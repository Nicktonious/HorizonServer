const ClassBaseService_S = require('srvService');

// ТОПИКИ/КОМАНДЫ
const COM_MQTT_PUBLISH  = 'mqttgw-publish';
// 
const BUS_NAME_LIST = ['sysBus', 'logBus', 'mqttGwBus', 'dataBus'];
const MQTTGW_BUS = 'mqttGwBus';

/** списки топиков */
const EVENT_ON_LIST_SYSBUS = ['all-init-stage1-set'];
const EVENT_ON_LIST_MQTTGWBUS = ['mqttgw-publish-topic'];
const EVENT_ON_LIST_DATABUS = ['all-data-fine-set'];

/********************************* */

/**
 * @class
 * Реализует функционал прокси к функциональным узлам, собирающим данные о хаб
 */
class ClassProxyMQTTGateway_S extends ClassBaseService_S {
    /**
     * @constructor
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        // передача в супер-конструктор имени службы и списка требуемых шин
        super({ _name: 'proxymqttgw', _busNameList: BUS_NAME_LIST, _busList, _node });

        this.FillEventOnList('sysBus', EVENT_ON_LIST_SYSBUS);
        this.FillEventOnList('mqttGwBus', EVENT_ON_LIST_MQTTGWBUS);
        this.FillEventOnList('dataBus', EVENT_ON_LIST_DATABUS);
    }
    /**
     * @method
     * @public
     * @description Срабатывает при запросе системной службы фреймворка на публикацию на брокер
     * @param {string} _topic 
     * @param {ClassBusMsg_S} _msg 
     */
    async HandlerEvents_all_data_fine_set(_topic, _msg) {
        const data = _msg.value[0];
        const broker_name = 'Broker01';

        this.EmitEvents_mqtt_publish({ value: [data], arg: [broker_name] });
    }
     /**
     * @method
     * @public
     * @description Отправляет команду на публикацию информации о канале
     */
     EmitEvents_mqtt_publish({ value=[], arg, dest }) {
        const msg = this.CreateMsg({
            com: COM_MQTT_PUBLISH,
            value,
            arg,
            dest
        });
        return this.EmitMsg(MQTTGW_BUS, COM_MQTT_PUBLISH, msg);         
    }
}

module.exports = ClassProxyMQTTGateway_S;
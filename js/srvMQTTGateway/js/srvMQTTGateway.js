const ClassBaseService_S = require('srvService');
const mqtt = require('mqtt');

const BUS_NAME_LIST = ['sysBus', 'logBus', 'mqttGwBus'];
const EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'all-connect', 'all-disconnect'];
const EVENT_MQTTGWBUS_LIST = ['mqttgw-publish'];
const PROTOCOL = 'mqttgw';

const WS = 'ws://';
const COLON = ':';
const PATH = '/mqtt';

const TOPIC_START = '/horizon/gateway/';

const CONNECTION_TIMEOUT = 5000;

/*
{
  Timestamp, 0 
  Name: <source_name>-<deviceID>-<chNum>, 1 
  Value: x, 2
  ChName, 3 
  ChAlias, 4
  ChMeas, 5
  CurrZone 6
}*/

/**
 * @class
 * Реализует функционал прокси к функциональным узлам, собирающим данные о хаб
 */
class ClassMQTTGateway_S extends ClassBaseService_S {
    #_Brokers;
    /**
     * @constructor
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        // передача в супер-конструктор имени службы и списка требуемых шин
        super({ _name: 'mqttgw', _busNameList: BUS_NAME_LIST, _busList, _node });
        this.#_Brokers = {};

        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('mqttGwBus', EVENT_MQTTGWBUS_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'MQTT Gateway initialized.'});
    }
    /**
     * @method
     * @description Запускает событие process-ws-connect-done
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_process_mqttgw_connect_done() {
        const msg = {
            com: 'process-mqttgw-connect-done',
            dest: 'process',
            arg: [],
            value: []
        }
        return this.EmitMsg('sysBus', msg.com, msg);
    }
     /**
     * @method
     * @description Обработчик события, запускает отправку сообщения по указанному сокету
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
     HandlerEvents_mqttgw_publish(_topic, _msg) {
        if (this.#_Brokers[_msg.arg[0]]) {
            this.Publish(_msg)
        }
    }
    /**
     * @method
     * @description Обработчик события, запускает подключение к источникам
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_all_connect(_topic, _msg) {
        this.EmitEvents_logger_log({level: 'I', msg: 'MQTT broker fetching. . .'});
        this.Start();
    }
    /**
     * @method
     * @description Обработчик события, закрывает все существующие соединения
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_all_disconnect(_topic, _msg) {
        Object.values(this.#_Brokers).forEach(broker => {
            broker.end();
        });
    }

    Publish(_msg) {
        const topic = TOPIC_START.concat(_msg.value[0].Name, '/'); // /horizon/gateway/PLC99-01-0/
        for (const [key, value] of Object.entries(_msg.value[0])) {
            try {
                this.#_Brokers[_msg.arg[0]].publish(topic.concat(key), value.toString());
            }
            catch (e) {
                this.EmitEvents_logger_log({level: 'W', msg: `Cannot publish ${key} of ${_msg.value[0].Name}`, obj: {exception: e.toString()}});
            }
        }
        this.EmitEvents_logger_log({level: 'I', msg: `Published data of ${topic}`});      
    }

    Start() {
        let sourcesCount = 0;
        let tOut = setTimeout(() => {
            this.EmitEvents_logger_log({level: 'I', msg: `MQTT connection routine done!`, obj: this.SourcesState});
            this.EmitEvents_process_mqttgw_connect_done();
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach(source => {
                const url = WS.concat((source.DN ? source.DN : source.IP),COLON, source.Port, PATH);
                this.#_Brokers[source.Name] = mqtt.connect(url, {username: source.Login, password: source.Password});
                sourcesCount++;

                this.#_Brokers[source.Name].on('connect', () => {
                    source.IsConnected = true;
                    source.CheckClient = true;
                    //this.#_Brokers[source.Name].publish('/horizonGW/test', 'Hello from gateway');
                    this.EmitEvents_logger_log({level: 'I', msg: `Connected to broker ${source.Name}.`});
                });

                this.#_Brokers[source.Name].on('close', () => {
                    source.IsConnected = false;
                    source.CheckClient = true;
                    this.EmitEvents_logger_log({level: 'I', msg: `Closed ${source.Name}.`});
                    this.#_Brokers[source.Name].end();
                    delete this.#_Brokers[source.Name];
                });

                this.#_Brokers[source.Name].on('error', (err) => {
                    this.EmitEvents_logger_log({level: 'I', msg: `Error ${err}.`});
                });
            })
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = ClassMQTTGateway_S;
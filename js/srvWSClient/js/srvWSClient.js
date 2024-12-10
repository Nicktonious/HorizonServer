const CONNECTION_TIMEOUT = 5000;

EVENT_SYSBUS_LIST = ['all-init-stage1-set', 'all-connect', 'all-disconnect'];
EVENT_LHPBUS_LIST = ['wsclient-send'];
BUS_NAMES_LIST = ['sysBus', 'lhpBus', 'logBus'];
const WS = 'ws://';
const COLON = ':';
const PROTOCOL = 'lhp';
const THIS_NAME = 'wsclient';

const { WebSocket, WebSocketServer } = require('ws');
const ClassBaseService_S = require('srvService');

class WebSocketClient extends ClassBaseService_S {
    #_Sockets;
    /**
     * @constructor
     * @description
     * Конструктор класса логгера
     * @param {[ClassBus_S]} _busList - список шин, созданных в проекте
     */
    constructor({ _busList, _node }) {
        super({ _name: THIS_NAME, _busNameList: BUS_NAMES_LIST, _busList, _node });
        this.#_Sockets = {};
        this.FillEventOnList('sysBus', EVENT_SYSBUS_LIST);
        this.FillEventOnList('lhpBus', EVENT_LHPBUS_LIST);
        this.EmitEvents_logger_log({level: 'I', msg: 'WSClient initialized.'});
    }
    /**
     * @method
     * @description Запускает событие process-ws-connect-done
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_process_ws_connect_done() {
        const msg = {
            com: 'process-ws-connect-done',
            dest: 'process',
            arg: [],
            value: []
        }
        return this.EmitMsg('sysBus', msg.com, msg);
    }
    /**
     * @method
     * @description Запускает событие process-ws-connect-done
     * @returns msg         - отправляемое сообщение
     */
    EmitEvents_proxywsclient_msg_get({arg, value}) {
        const msg = {
            source: 'proxywsclient',
            com: 'proxywsclient-msg-get',
            arg,
            value
        };
        this.EmitMsg('lhpBus', msg.com, msg);
    }
    /**
     * @method
     * @description Обработчик события, запускает подключение к источникам
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_all_connect(_topic, _msg) {
        this.EmitEvents_logger_log({level: 'I', msg: 'Connection starting. . .'});
        this.Start();
    }
     /**
     * @method
     * @description Обработчик события, запускает отправку сообщения по указанному сокету
     * @param {String} _topic       - топик сообщения 
     * @param {Object} _msg         - само сообщение
     */
    HandlerEvents_wsclient_send(_topic, _msg) {
        try {
            this.#_Sockets[_msg.arg[0]].send(_msg.value[0]);
            this.EmitEvents_logger_log({level: 'I', msg: `Message sent to ${_msg.arg[0]}`});
        }
        catch (e) {
            this.EmitEvents_logger_log({level: 'W', msg: `Cannot find source ${_msg.arg[0]}`, obj: {exception: e.toString()}});
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
            socket.close();
        });
    }
    /**
     * @method
     * @description Инициализирует соединение с источниками по вебсокетам
     */
    Start() {
        let sourcesCount = 0;
        let tOut = setTimeout(() => {
            this.EmitEvents_logger_log({level: 'I', msg: `Connections done!`, obj: this.SourcesState});
            this.EmitEvents_process_ws_connect_done();
        }, CONNECTION_TIMEOUT);
        Object.values(this.SourcesState)
            .filter(source => source.Protocol === PROTOCOL && !source.IsConnected && source.CheckProcess && source.Status === 'active')
            .forEach(source => {
                const name = (source.DN ? source.DN : source.IP);
                this.#_Sockets[source.Name] = new WebSocket(WS.concat(name, COLON, source.Port));
                sourcesCount++;

                this.#_Sockets[source.Name].addEventListener('open', (event) => {
                    source.IsConnected = true;
                    source.CheckClient = true;
                    this.EmitEvents_logger_log({level: 'I', msg: `Connected to ${source.Name}`, obj: {IP: name}});
                });

                this.#_Sockets[source.Name].addEventListener('close', (event) => {
                    this.EmitEvents_logger_log({level: 'I', msg: `Disconnected from ${source.Name}`, obj: {IP: name}});
                    source.IsConnected = false;
                    source.CheckClient = true;
                    delete this.#_Sockets[source.Name];
                });

                this.#_Sockets[source.Name].addEventListener('message', (event) => {
                    //this._sysBus.emit("wsc-msg-return", event.data, sourceName)
                    this.EmitEvents_logger_log({level: 'I', msg: `Got data from ${source.Name}`, obj: {data: event.data.toString()}});
                    this.EmitEvents_proxywsclient_msg_get({arg: [source.Name], value: [event.data]});
                });

                this.#_Sockets[source.Name].addEventListener('error', (error) => {
                    this.EmitEvents_logger_log({level: 'W', msg: `Error with ${source.Name}`, obj: {IP: name, error: error.message.toString()}});
                });            
        });
        if (sourcesCount == 0) {
            clearTimeout(tOut);
            this.EmitEvents_logger_log({level: 'I', msg: `No unconnected sources found!`, obj: this.SourcesState});
        }
    }
}

module.exports = WebSocketClient;
<div style="font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvMQTTClient

<div style="color: #555">
<p align="center">
<img src="./res/logo.png" width="400" title="hover text">
</p>
</div>

## Лицензия
////

### Описание
**ClassMQTTClient_S** реализует функционал службы **mqttclient** серверного фреймворка. Служба предназначена для взаимодействия с mqtt-брокером:
- подключение, перехват ошибок и разрыва соединения;
- подписка на топики;
- получение сообщений с брокера;
- запись сообщений на брокеры.

### Поля
<div style="color: #555">

- #_Clients — объект, коллекция активных подключений по именам источников `{ [source_name]: mqttClient }`;
- #_Sources — переданная конфигурация источников данных (или `null`, если конфигурация берётся из `this.SourcesState`).

</div>

### Конструктор
<div style="color: #555">

```js
constructor({ _busList, _node, sources } = {})
```

- `_busList` — список шин, созданных в проекте (`sysBus`, `mqttBus`, `logBus`);
- `_node` — объект узла Node-RED;
- `sources` — *(опционально)* массив или объект конфигураций источников данных. Данный параметр пока предусмотрен в первую очередь для тестов и является опциональным. В штатном режиме работы список источников по-прежнему попадает в класс через ссылку на `SourcesState` базового класса (`ClassBaseService_S`).

</div>

### Аксессоры

<div style="color: #555">

- `get ConnectedNames` — возвращает массив строковых имён источников, к которым в данный момент установлено активное соединение (`_client?.connected`);
- `get Clients` — возвращает объект коллекции активных клиентских подключений `#_Clients`;
- `get MQTTSources` — возвращает отфильтрованный список неподключенных источников с протоколом `'mqtt'` из `sources` или `SourcesState`.

</div>

### Подписки

#### sysBus
- `'all-init-stage1-set'` — инициализация службы: обход источников из `MQTTSources`, подключение к брокерам через `ConnectSource` и отправка `all-connections-done`;
- `'all-close'` — останов службы: перехват события завершения и принудительный разрыв всех клиентских соединений (`client.end(true)`).

#### mqttBus
- `'mqttclient-send'` — команда публикации сообщения на брокере:
```js
{
    com: 'mqttclient-send',
    arg: [source_name],
    value: [topicName, payload]
}
```
- `'mqttclient-sub'` — команда подписки на топики брокера:
```js
{
    com: 'mqttclient-sub',
    arg: [source_name],
    value: [topic_name_list] // массив топиков для подписки
}
```

### События

#### sysBus
- `'all-source-connected'` — отправка системного сообщения об успешном первичном подключении или восстановлении связи с источником:
```js
{
    dest: 'dm',
    com: 'all-source-connected',
    arg: [source_name]
}
```
- `'all-source-disconnected'` — отправка системного сообщения о разрыве соединения или ошибке связи с источником:
```js
{
    dest: 'dm',
    com: 'all-source-disconnected',
    arg: [source_name]
}
```
- `'all-connections-done'` — отправка сообщения о завершении этапа первичных подключений:
```js
{
    dest: 'dm',
    com: 'all-connections-done',
    arg: [source_name1, source_name2, ...] // ConnectedNames
}
```

#### mqttBus
- `'proxymqttclient-msg-get'` — отправка сообщения с полученными от брокера данными на сервис `proxymqttclient`:
```js
{
    dest: 'proxymqttclient',
    com: 'proxymqttclient-msg-get',
    arg: [source_name],
    value: [topic_name, payload_str]
}
```

### Методы

<div style="color: #555">

- `ConnectSource(_source)` — *(public async)* подключает указанный источник к MQTT-брокеру (`mqtt.connectAsync`), устанавливает обработчики событий соединения, сохраняет клиент в `#_Clients` и отправляет `all-source-connected`. Возвращает экземпляр `mqtt.MqttClient` или `null`;

- `HandlerEvents_all_init_stage1_set(_topic, _msg)` — обрабатывает событие инициализации первого этапа, запускает подключение для всех неподключенных MQTT-источников и отправляет `all-connections-done`;

- `HandlerEvents_all_close(_topic, _msg)` — перехватывает событие останова и принудительно завершает работу всех активных клиентов `#_Clients` вызовом `client.end(true)`;

- `HandlerEvents_mqttclient_send(_topic, _msg)` — принимает команду публикации и отправляет сообщение в указанный топик на брокере через `client.publishAsync`;

- `HandlerEvents_mqttclient_sub(_topic, _msg)` — выполняет подписку на переданный список топиков брокера (`client.subscribe`);

- `EmitEvents_all_source_connected({ arg })` — отправляет на `sysBus` сообщение `all-source-connected`;

- `EmitEvents_all_source_disconnected({ arg })` — отправляет на `sysBus` сообщение `all-source-disconnected`;

- `EmitEvents_all_connections_done({ arg })` — отправляет на `sysBus` сообщение `all-connections-done` со списком подключенных источников;

- `EmitEvents_proxymqttclient_msg_get({ value, arg })` — отправляет на `mqttBus` входящие данные брокера для `proxymqttclient`;

- `#SetConnectionHandlers(_connection, _source)` — *(private)* назначает обработчики событий MQTT-клиента:
  - `'message'` -> отправка `proxymqttclient-msg-get`;
  - `'connect'` -> выставляет `_source.IsConnected = true` и отправляет `all-source-connected`;
  - `'close'` -> выставляет `_source.IsConnected = false` и отправляет `all-source-disconnected`;
  - `'error'` -> выставляет `_source.IsConnected = false` и отправляет `all-source-disconnected`.

</div>

### Пример
```js

```
</div>

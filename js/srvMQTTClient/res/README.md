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

### Подписки
- 'all-init-stage1-set' — инициализация службы;
- 'mqttclient-msg-get' — обработка входящих сообщений;
```js
{
    com: 'mqttclient-msg-get', 
    arg: [source_name],  
    value: [topicName, payload] 
}
```
- 'mqttclient-sub' — команда подписаться на топик.
```js
{
    com: 'mqttclient-sub', 
    arg: [source_name],  
    value: [topic_name_list] 
}
```

### События
- 'proxymqttclient-msg-get' — отправка сообщения с собранными данными на прокси-сервис для дальнейшей обработки.
```js
{
    com: 'mqttclient-msg-get',
    arg: [source_name],
    value: [ topic_name, payload ]
}
```
- 'all-source-disconnected' — отправка сообщения об отключении от источника.
```js
{
    com: 'all-source-disconnected',
    arg: [source_name]
}
```

### Поля
<div style="color: #555">

- #_Clients — объект, коллекция подключений.

</div>

### Конструктор
<div style="color: #555">

- _busList — список шин, созданных в проекте;
- _node — объект узла;

</div>

### Методы

<div style="color: #555">

- HandlerEvents_all_init_stage1_set(_topic, _msg) — обрабатывает событие инициализации, получает имя хоста и запускает опрос каналов;
  
- HandlerEvents_mqttclient_send(_topic, _msg) — принимает сообщение и отправляет его на брокер;

- HandlerEvents_mqttclient_sub(_topic, _msg) — выполняет подписку на указанный топик брокера;

- EmitEvents_proxymqttclient_msg_get({ value, arg }) — отправляет на mqttBus сообщение с данными от брокера;

- EmitEvents_all_source_disconnected({ arg }) — отправляет на sysBus сообщение о разрыве соединения;

- EmitEvents_all_connections_done({ arg }) — отправляет на sysBus сообщение о готовности подключений;

- #EstablishConnections() — устанавливает обходит подключения с доступными источниками. Созданные клиенты сохраняются в поле #_Clients;

- #CreateConnection(_source) — создает объект подключения;

- #SetConnectionHandlers(_connection, _source) — устанавливает обработчики на события подключения;

</div>

### Пример
```js

```
</div>
<div style="font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvProxyWSC

<div style="color: #555">
<p align="center">
<img src="./res/logo.png" width="400" title="hover text">
</p>
</div>

## Лицензия
////

### Описание
**ClassProxyMQTTClient_S** реализует функционал службы **proxywmqttclient** фреймворка Horizon Automation. 
Служба предназначена для обеспечения взаимодействия между **mqttclient**, обеспечивающим клиент-серверное взаимодействие с источником, и службами фреймворка. 
**proxywsclient** является посредником при передаче и приёме сообщений от **mqttclient**. Также прокси реализует обработку 
- запроса на получение списка каналов;
- запроса подписки на каналы. 

### Подписки
- 'proxymqttclient-send' — обработка отправки сообщений через **mqttclient**;
```js
{
    dest: 'mqttclient',
    com: 'mqttclient-send',
    arg: [source_name]
    value: [payload]
}
```
- 'proxymqttclient-msg-get' — получение сообщения от **mqttclient**;
```js
{
    com: 'proxymqttclient-msg-get',
    arg: [source_name]
    value: [topic_name, payload]
}
```
- 'proxymqttclient-deviceslist-get' - запрос на получение списка каналов источника; приводит к отправке команды 'dm-deviceslist-get' на PLC;
```js
{
    com: 'proxymqttclient-deviceslist-get',
    arg: [source_name]
    value: []
}
```
- 'proxymqttclient-sub-sensorall' - запрос на подписку на каналы источника; приводит к отправке команды 'dm-sub-sensorall' на PLC. 
```js
{
    com: 'proxymqttclient-sub-sensorall',
    arg: [source_name]
    value: [{ sensor: [{ name, address }, ...], actuator: [...] }]
}
```

### События
- 'mqttclient-send' - отправка сообщения на службу mqttclient;
```js
{ 
    com: 'mqttclient-send',
    arg: [source_name], 
    value: [topic_name, payload]   // payload - значение канала 
}
```
- 'mqttclient-msg-get' - прием сообщения от службы mqttclient, за которой выполняется его распаковка и отправка на шину.
```js
{ 
    com: 'mqttclient-msg-get',     // извлекается из сообщения от mqttclient
    arg: [source_name],            // arg = [sourceName] 
    value: [topic_name, payload]   
}
```

- 'proxymqttclient_deviceslist_get' - запрос на получение списка каналов источника.
```js
{ 
    com: 'proxymqttclient_deviceslist_get',
    arg: [source_name],  
    value: []   
}
```

### Поля
<div style="color: #555">

- #_SensSubList — объект, маппинг-таблица следующего вида:
```js
{
    source_name1: [{ address: topic_name1, name: ch_name1 }, ...],
    source_name_n: [{ address: topic_name_n, name: ch_name_n }, ...],
    ...
}
```

</div>

### Конструктор
<div style="color: #555">

- _busList — список шин, созданных в проекте;
- _node — объект узла.

</div>

### Методы

<div style="color: #555">

- HandlerEvents_proxymqttclient_send(_topic, _msg) — вызывается при запросе системной службы на отправку сообщения через *mqttclient*;
  
- HandlerEvents_proxymqttclient_msg_get(_topic, _msg) — обрабатывает событие получения сообщения от **mqttclient** и передает его на соответствующую шину;

- HandlerEvents_proxymqttclient_deviceslist_get(_topic, _msg) — обрабатывает запрос на получение списка каналов источника;

- HandlerEvents_proxymqttclient_sub_sensorall(_topic, _msg) — создает маппинг-таблицу каналов и топиков;

- EmitEvents_mqttclient_sub({ arg, value }) — отправляет на **mqttclient** запрос на подписку на указанные топики;

- EmitEvents_dm_deviceslist_set({ arg, hash }) — отправляет на **dm** список каналов;

- EmitEvents_mqttclient_send({ value, arg, dest }) — отправляет сообщение на **mqttclient**;

</div>

### Пример
```js

```

</div>


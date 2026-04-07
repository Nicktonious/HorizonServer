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
**ClassProxyWSClient_S** реализует функционал службы **proxywsclient** фреймворка Horizon Automated. 
Служба предназначена для обеспечения взаимодействия между **wsclient**, обеспечивающим клиент-серверное взаимодействие с источником, и службами фреймворка. 
**proxywsclient** является посредником при передаче и приёме сообщений от **wsclient**. Также прокси реализует обработку 
- запроса на получение списка каналов;
- запроса подписки на каналы. 

### Подписки
- 'proxywsclient-send' — обработка отправки сообщений через **wsclient**;
- 'proxywsclient-msg-get' — получение сообщения от **wsclient**;
- 'proxywsclient-deviceslist-get' - запрос на получение списка каналов источника; приводит к отправке команды 'dm-deviceslist-get' на PLC; 
- 'proxywsclient-sub-sensorall' - запрос на подписку на каналы источника; приводит к отправке команды 'dm-sub-sensorall' на PLC. 

### События
- 'wsclient-send' - отправка сообщения на службу wsclient;
```js
{ 
    com: 'wsclient-send',
    value: [lhp_msg],   // string
    arg: [source_name] 
}
```
- 'wsclient-msg-get' - прием сообщения от службы wsclient, за которой выполняется его распаковка и отправка на шину.
```js
{ 
    hash,
    com: msg_from_plc.com,  // извлекается из сообщения от wsclient
    arg: _msg.arg,          // arg = [sourceName] 
    value: [msg_from_plc]   // извлекается из сообщения от wsclient
}
```

- 'proxywsclient_deviceslist_get' - запрос на получение списка каналов источника.
```js
{ 
    arg: _msg.arg,  
    value: [lhp_msg]   
}
```

### Поля
<div style="color: #555">

- #_RequestList — список текущих запросов, требующих ответа.

</div>

### Конструктор
<div style="color: #555">

- _busList — список шин, созданных в проекте;
- _node — объект узла.

</div>

### Методы

<div style="color: #555">

- HandlerEvents_proxywsclient_send(_topic, _msg) — вызывается при запросе системной службы на отправку сообщения через WSC. Сохраняет хэш сообщения, если требуется ответ;
  
- HandlerEvents_proxywsclient_msg_get(_topic, _msg) — обрабатывает событие получения сообщения от **wsclient** и передает его на соответствующую шину;

- EmitEvents_wsclient_send({ value, arg, dest }) — отправляет сообщение на **wsclient**;

- HandlerEvents_proxywsclient_deviceslist_get(_topic, _msg) -обрабатывает запрос на получение списка каналов источника;

- HandlerEvents_proxywsclient_sub_sensorall(_topic, _msg) - 
отправляет на PLC команду 'dm-sub-sensorall', которая инициирует опрос каналов и рассылку данных с PLC;

- #IsActuatorWrite(_msg) - возвращает true если команда поступила от службы-актуатора

- #GetPLCMsg(_msg) - возвращает сообщение, которое будет отправлено на PLC через wsclient

- #SaveMsgHash(_msg) — сохраняет хэш сообщения, ожидающего ответа, с таймаутом для очистки;

- #GetMsgHash(_com, _sourceName) — возвращает хэш запроса, для которого пришел ответ.

</div>

### Пример
```js
const ClassProxyWSClient_S = require('srvProxyWSClient_S');
const proxywsc = new ClassProxyWSClient_S({ _busList, _node });
```

</div>


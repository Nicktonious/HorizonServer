<div style="font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvProxyRpiClient

<div style="color: #555">
<p align="center">
<img src="./res/logo.png" width="400" title="hover text">
</p>
</div>

## Лицензия
////

### Описание
**ClassProxyRpiClient_S** реализует функционал службы **proxyrpiclient** серверного фреймворка. Служба предназначена для осуществления передачи данных от **rpiclient** другим службам фреймворка. 
Класс обрабатывает запросы на получение списка каналов, подписку на каналы, а также принимает и пересылает данные, поступающие с этих каналов.

### Подписки
- 'all-init-stage1-set' — инициализация службы;
- 'proxyrpiclient-sub-sensorall' - запрос-подписка на каналы **rpiclient**; 
- 'proxyrpiclient-deviceslist-get' — запрос на получение списка каналов с хаба;
- 'proxyrpiclient-msg-get' — обработка сообщения с данными от Raspberry Pi.

### События
- 'dm-deviceslist-set' — отправка списка устройств в диспетчер устройств (Device Manager);
- 'all-data-raw-get' — отправка сырых данных, полученных с каналов, на все службы.

### Поля
<div style="color: #555">

- #_ChList — список каналов (виртуальных сенсоров) для сбора данных с **rpiclient**.

</div>

### Конструктор
<div style="color: #555">

- _busList — список шин, созданных в проекте;
- _node — объект узла.

</div>

### Методы

<div style="color: #555">

- HandlerEvents_all_init_stage1_set(_topic, _msg) — обрабатывает событие инициализации, назначая основной шиной для источников данных Raspberry Pi шину 'rpiBus';

- HandlerEvents_proxyrpiclient_sub_sensorall(_topic, _msg) - принимает подписку на каналы и отправляет на **rpiclient** команду старта циклической рассылки данных с каналов;
  
- HandlerEvents_proxyrpiclient_deviceslist_get(_topic, _msg) — принимает запрос на получение списка устройств с Raspberry Pi и отправляет список в диспетчер устройств;

- HandlerEvents_proxyrpiclient_msg_get(_topic, _msg) — форматирует и передает данные, поступившие с Raspberry Pi, в систему;

- EmitEvents_dm_deviceslist_set(_topic, _msg) — отправляет список каналов Raspberry Pi в диспетчер устройств.

</div>

### Пример
```js
const ClassProxyRpiClient_S = require('srvProxyRpiClient');
const proxyrpiclient = new ClassProxyRpiClient_S({ _busList, _node });
```

</div>
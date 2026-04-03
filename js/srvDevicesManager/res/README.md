<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvDeviceManager
<div style = "color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

## Лицензия
////

### Описание
<div style = "color: #555">

**ClassDeviceManager_S** реализует функционал службы **dm** серверного фреймворка Horizon Automated.
Служба предназначена для организации взаимодействия между источниками и другими службами фреймворка. **dm** берет на себя роль в работе с каналами в тех случаях, когда коммутация сообщений через одну службу будет оптимальнее чем рассылка сообщений от всех служб-каналов параллельно.

Класс обеспечивает
- формирование запросов на получение списков каналов у прокси служб-источников; службы-каналы активируются при наличии записи о себе ответных списках;  
- формирование запросов-подписок на каналы у прокси служб; 
- динамическое отражение полученной информации о каналах State-объект источников;
- мониторинг статуса инициализированных служб-каналов.

### Подписки
- 'dm-new-channel' - сообщение об инициализации канала;
Сокращенный формат сообщения: 
```js
{
    com: 'dm-new-channel',
    arg: ['<ch_name>'],
    value: ['<channel>']
}
```

- 'dm-deviceslist-set' - сообщение-ответ со списком каналов источника.
```js
{
    com: 'dm-deviceslist-set',
    arg: ['<source_name>'],
    value: [ 
        { 
            sensor:   ['<article|hash>-<device_id>-<ch_num>', ...], 
            actuator: ['<article|hash>-<device_id>-<ch_num>', ...] 
        } 
    ]
}
```

### События
- 'process-channels-ready' - сообщение о готовности всех каналов;
```js
{
    dest: 'process',
    com: 'process-channels-ready'
}
```
- 'proxy${name}-deviceslist-get' - запрос на получение списка каналов; 

- 'proxy${name}-sub-sensorall' - запрос на подписку;
```js
{
    dest,   // proxywsclient | proxymqttclient | rpiclient
    com: `${dest}-sub-sensorall`,
    arg: [source_name],
    value: [{ sensor, actuator }]   // { sensor: [{ name, address}, ...], actuator: [{ name, address}, ...]}
}
```
- 'dm-deviceslist-set' - сообщение со списком каналов, предназначенное службам-каналам.

### Поля
<div style = "color: #555">

- #_Channels — список инициализированных служб-каналов.

</div>

### Конструктор
<div style = "color: #555">

- _busList — список инициализированных шин;

### Аксессоры
<div style = "color: #555">

</div>

### Методы
<div style = "color: #555">

- HandlerEvents_dm_deviceslist_set(_topic, _msg) -
Обрабатывает событие получения списка устройств и создаёт каналы датчиков и актуаторов на основе полученных данных;

- HandlerEvents_all_connections_done(_topic, _msg) -
Обрабатывает завершение всех подключений и отправляет запросы на получение списка каналов с каждого подключенного источника;

- HandlerEvents_dm_new_channel() -
Обрабатывает сообщение о создании службы-канала;

- EmitEvents_providermdb_channels_get() - 
Отправляет запрос на получение каналов через службу `providermdb`;

- EmitEvents_dm_deviceslist_set({ arg, value }) -
Повторно отправляет на шину полученное сообщение со списком каналов для того чтобы его смогли получить службы-каналы;

- HandlerEvents_all_connections_done(_topic, _msg) -
Инициирует запросы на получение списка каналов согласно *SourcesState* 

- EmitEvents_process_channels_ready() -
Отправляет по sysBus сообщение о том, что все службы-каналы установили статус 'active';

- EmitEvents_proxywsclient_send({ value, arg, demandRes, resCom, opts }) - 
Отправляет сообщение на WebSocket-источник через proxy-службу;

- EmitEvents_proxy_deviceslist_get() -
Отправляет запрос на получение списка каналов источника;

- EmitEvents_sub_sensorall({ dest, arg }) - 
Отправляет запрос на подписку на указанные каналы источника.

</div>

### Примеры
```js
const deviceManager = new ClassDeviceManager_S({ _busList, _node });
```

</div>
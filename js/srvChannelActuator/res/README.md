<div style="font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvChannelActuator
<div style="color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

## Лицензия
////

### Описание
<div style="color: #555">

**ClassChannelActuator_S** — это класс, представляющий каждый отдельно взятый канал актуатора в качестве службы фреймворка. Он управляет процессом передачи значений через шины, выполняет обработку данных, а также обеспечивает управление состоянием и задачами актуатора.

### Поля
<div style="color: #555">

- #_Value - последнее значение, заданное актуатору;
- #_ChType - тип, всегда 'actuator'
- #_ChAlias - второе имя канала; 
- #_ChMeas - единица измерения;
- #_SourceBus — шина, связывающая канал с источником данных;
- #_MappingCompleted — статус канала (не опрашивается, опрашивается и т.д.);
- #_SourceName — идентификатор источника;
- #_DeviceId — идентификатор устройства;
- #_DeviceIdHash - уникальный хэш, идентифицирующий модель актуатора;
- #_Address - топик, ассоциированный с каналом;
- #_ChNum — номер канала (начиная с 0);
- #_ChangeThreshold — порог изменения для значений канала;
- #_Tasks — объект для хранения задач актуатора;
- #_SourcesState — состояние источников;
- #_DeviceInfo — информация о физическом актуаторе;
- #_Transform — настройки преобразования данных;
- #_Suppression — настройки подавления данных;
- #_Filter — фильтр для значений канала;
- #_Alarms — объект для работы с тревогами.

</div>

### Конструктор
<div style="color: #555">

- _busList - массив шины;
- _busNameList - список имен шин;
- _advOpts - объект, содержащий настройки канала (имя источника, идентификатор устройства и номер канала).

### Аксессоры
<div style="color: #555">

- get ChName - Возвращает имя канала согласно имеющейся информации об устройстве;
- get ChAlias - Возвращает alias канала;
- get ChMeas - Возвращает строковое обозначение единицы измерения показаний канала;
- get ChType - Возвращает строковое тип канала "сенсор" | "актуатор";
- get DeviceIdHash - Возвращает ID устройства, к которому относится канал;
- get Status - "active"/"inactive" в зависимости от того было ли выполнено маппирование с каналом источника и подключен ли источник в данный момент.

</div>

### Подписки

- 'all-device-config-set' - сообщение с информацией о физическом актуаторе;
- 'dm-deviceslist-set' - сообщение со списком каналов подключенного источника;
- 'all-init-stage1-set' - этап инициализации системы;
- 'all-actuator-set' - команда на изменение значения канала;
```js
{
    com: 'all-actuator-set',
    arg: [ch_name]
    value: [x]
}
```
- 'all-ch-status-set' - команда на активацию/деактивацию канала;
```js
{
    com: 'all-ch-status-set',
    arg: [ch_name],
    value: [status]     //'active'/'inactive'
}
```

### События
- 'all-ch-status-get' - сообщение с актуальным статусом канала;
```js
{
    com: 'all-ch-status-get',
    arg: [ch_name],
    value: [ch_status]  // 'active'/'inactive'
}
```
- 'dm-new-channel' - сообщение об инициализации:
```js
{
    com: 'dm-new-channel',
    arg: [ch_name],
    value: [this]   // ссылка на объект канала
}
```
```js
{
    com: 'proxy${name}-send',
    arg: [source_name],
    value: [{
        arg: [ch_name], 
        value: x
    }]
}
```
- all_data_fine_set' - Отправляет на dataBus сообщение со значением канала;
```js
{
    dest: 'all',
    com: 'all-data-fine-set',
    arg: [ch_name],
    value: [{
        Name
        Value
        ChName
        ChAlias
        ChMeas
        CurrZone
    }]
}
```

### Методы
<div style="color: #555">

- SetValue(_val, _opts) - отправляет на транспортную шину команду с указанным значением канала;

</div>

### Пример использования
```js

```

</div>
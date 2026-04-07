<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# srvChannelSensor
<div style = "color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

## Лицензия
////

### Описание
<div style = "color: #555">

**ClassChannelSensor** — это класс, представляющий канал (виртуальный датчик) в качестве службы фреймворка. Как наследник класса **[ClassChannel_S](../../srvChannel/res/README.md)** обеспечивает
- инициализацию службы;
- хранение объекта с информацией о физическом датчике;
- конфигурацию канала (настройку мат. обработки, зон измерения, значений по умолчанию); 
- запись обновляемых значений в БД через службу **providermdb**. 

Собственно служба предназначена для приёма и обработки данных, получаемых от источников с дальнейшей трансляцией обработанных данных на шину, доступную пользователю.

*Name* службы соответствует одноименному свойству в конфигурации.  

<div style="color: #555">
<p align="center">
<img src="./srvChannel.png" width="400" title="hover text">
</p>
</div>

### Конструктор
- _busList - массив шины;
- _busNameList - список имен шин;
- _advOpts - объект, содержащий настройки канала (имя источника, идентификатор устройства и номер канала).

Пример конфигурации:
```js
{ 
    ChStatus: "active", 
    ChType:   "sensor",  
    Name:     "mqtt-Temp1",    
    ChMeas:   "C",      
    SourceName: "Broker01", 
    DeviceId:   "adam",   
    ChNum: 2, 
    DeviceHash: "e8fb-b1b0-2899-488d", 
    Address:    "Advantech/00D0C9F712B4/data", 
    ValueKey:   "ai3", 
    Config: { transform: { k: 100, b: -50.0 } },
    SavingValues: { raw: false, fine: false }
}
```

### Поля

- #_ValueBuffer — буфер для хранения значений канала;
- #_Value — текущее значение канала;
- #_Bypass — флаг указывающий на то что необходимо пропускать математическую обработку занчения `Value`; устанавливается пользователем либо автоматически (если `ValueType == 'string'`);
- #_DataUpdated — флаг указывающий что `Value` обновился;
- #_DataWasRead — флаг указывающий что `Value` еще не был считан;
- #_TimeStamp — временная метка последнего обнеовления `Value`;

### Аксессоры

- get ChName - Возвращает имя канала согласно имеющейся информации об устройстве;
- get ChAlias - Возвращает alias канала;
- get ChMeas - Возвращает строковое обозначение единицы измерения показаний канала;
- get ChType - Возвращает строковое тип канала "сенсор" | "актуатор";
- get DeviceIdHash - Возвращает ID устройства, к которому относится канал;
- get Status - "active"/"inactive" в зависимости от того было ли выполнено маппирование с каналом источника и подключен ли источник в данный момент.


### Подписки

- 'all-data-raw-get' — показание канала, поступившее от источника. 
Формат сообщения: 
```js
{
    metadata: { ... },
    com: 'all-data-raw-get',
    arg: ['source1_name'],
    value: [
        {
            com: 'all-data-raw-get',
            arg: ['00-01'],
            value: [ x ]
        }
    ]
}
```
Также **ClassChannelSensor_S** реализует [подписки](../../srvChannel/res/README.md/#подписки) базового класса

### Исходящие сообщения
- 'all-data-fine-get' — сообщение с последним обработанным значением канала; транслируется на **dataBus**. 
Сокращенный формат сообщения: 
```js
{
    com: 'all-get-data-fine',
    arg: ['source1_name-00-01'],
    value: [ {
        Name,
        Value,
        ValueSuppressed,
        ChName,
        ChAlias,
        ChMeas,
        CurrZone
    } ]
}
```

### Методы
- HandlerEvents_all_init_stage1_set(_topic, _msg) - Обрабатывает команду 'all-init-stage1-set' на инициализацию службы: выполняет подписку на сообщения по транспортной шине и вызывает `super.EmitEvents_dm_new_channel()`;
- HandlerEvents_all_data_raw_get(_topic, _msg) - Обрабатывает событие получения сырого значения данных и обновляет значение канала; в зависимости от значения поля `SavingValues.raw`, `SavingValues.fine` в методе вызываются запись в БД "сырого" и обработанного значения соответсвенно; 
- EmitEvents_all_data_fine_set() - Отправляет на dataBus сообщение со значением канала;
- EnableAlarms() - Инициализирует объект ClassAlarms для работы с тревогами;
- ClearBuffer() - Очищает буфер и сбрасывает текущее значение канала.

### Пример использования
```js
const channelSensor = new ClassChannelSensor({ _busList, _busNameList }, { sourceName, deviceId, chNum }, _deviceInfo);
```

</div>

</div>
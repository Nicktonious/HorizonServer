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

**ClassChannelSensor** — это класс, представляющий канал актуатора (виртуальное исполнительное устройство) в качестве службы фреймворка. Как наследник класса **[ClassChannel_S](../../srvChannel/res/README.md)** обеспечивает
- инициализацию службы;
- хранение объекта с информацией о физическом устройстве;
- конфигурацию канала (настройку мат. обработки, зон измерения, значений по умолчанию); 

Собственно служба предназначена для отправки команд от пользователя на службу источника для изменения состояния реального устройства.

*Name* службы соответствует одноименному свойству в конфигурации.  

<div style="color: #555">
<p align="center">
<img src="./srvChannel.png" width="400" title="hover text">
</p>
</div>

### Конструктор
<div style="color: #555">

- _busList - массив шины;
- _busNameList - список имен шин;
- _advOpts - объект, содержащий настройки канала (имя источника, идентификатор устройства и номер канала).

### Поля
<div style="color: #555">

- #_Value - последнее значение, заданное актуатору.

</div>

### Аксессоры

### Подписки

- 'all-actuator-set' - команда на изменение значения канала;
```js
{
    com: 'all-actuator-set',
    arg: [ch_name]
    value: [x]
}
```
Также **ClassChannelActuator_S** реализует [подписки](../../srvChannel/res/README.md/#подписки) базового класса

### События

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
- all-data-fine-set' - Отправляет на dataBus сообщение со значением канала;
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
- GetInfo - Метод предназначен для предоставления дополнительных сведений об измерительном канале или физическом устройстве;
- HandlerEvents_all_init_stage1_set(_topic, _msg) - Обрабатывает команду 'all-init-stage1-set' на инициализацию службы: выполняет подписку на сообщения по транспортной шине и вызывает `super.EmitEvents_dm_new_channel()`;
- HandlerEvents_all_actuator_set(_topic, _msg) - 
- EmitEvents_proxy_send({ value }) - отправляет на прокси-службу команду на изменение значения актуатора;
- EmitEvents_all_data_fine_set({ value }) - отправляет на dataBus сообщение со значением канала.

</div>

### Пример использования
```js

```

</div>
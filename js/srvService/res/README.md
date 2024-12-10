<div style = "font-family: 'Open Sans', sans-serif; font-size: 16px">

# ClassBaseService_S
<div style = "color: #555">
    <p align="center">
    <img src="./res/logo.png" width="400" title="hover text">
    </p>
</div>

## Лицензия
////

### Описание
<div style = "color: #555">

**ClassBaseService_S** – это базовый класс серверной службы фреймворка Horizon. Он реализует идентификацию служб и обеспечивает взаимодействие через два интерфейса: один для работы с внутренними шинами фреймворка Horizon, а другой для интеграции с узлами Node-RED.

Функционал:
- Подписка на события указанной шины (включая Node-RED);
- Обработка основных системных событий, таких как 'all-init1', 'all-close';
- Реализация паттерна Singleton для предотвращения инициализации служб с повторяющимся именем;
- Формирование и отправка сообщений на шины Horizon и Node-RED.

</div>

### Подписки
<div style = "color: #555">
- 'all-init0' - фаза инициализации 0;
- 'all-init1' - фаза инициализации 1;
- 'all-close' - редеплой Node-RED, который приводит к необходимости обнулить поля объекта.

</div>

### Исходящие сообщения
- 'logger-log' - сообщение на логгер;
Краткий формат сообщения: 
```js
{
    com: 'logger-log',
    arg: ['<log_level>'],
    value: ['<msg>', '<obj>']
}
```

### Поля
<div style = "color: #555">

- static #_ServicesNameList - статическая коллекция доступных имен служб;
- static #_InstancedNameList -  статическая коллекция инициализированных служб;
- #_Name - имя службы;
- #_BusNameList - список имен шин, требуемых службе;
- #_Status - статус службы 'active | inactive';
- #_GlobalBusList - глобальная коллекция инициализированных шин;
- #_Node - объект node;
- #_EventOnList - коллекция всех событий, которые слушает служба по шине (ключ - имя шины);
- #_EventEmitList - коллекция всех событий, которые направляются слушателю (ключ - имя слушателя);
- #_BusHandlerList - объект, хранящий агрегатные обработчики шин;
- #_HandlerFunc - хранит значения типа 'топик события : функция обработчик';
- #_EmitFunc - хранит значения типа 'топик события': функция-emit;
- #_PromiseList - контейнер с промисами, привязанными к запросам;
- #_ServicesState - объект служб;
- #_BusList - объект-коллекция шин, используемых службой.

</div>

### Методы
<div style = "color: #555">

- FillEventOnList(_busName, ..._topicNames)
  - Добавляет топики для подписки по шине и активирует обработчики.

- EmitMsg(_busName, _topic, _msg, _opts)
  - Отправляет сообщение по шине с возможностью ожидания ответа.

- UpdateBusList()
  - Обновляет коллекцию используемых шин, подтягивая шины из глобальной коллекции.

- CreateMsg(_msgOpts)
  - Создает и возвращает объект сообщения, который будет отправлен через шину.

- EmitEvents_logger_log({ level, msg, obj })
  - Отправляет лог-сообщения в систему логирования через шину.

</div>

### Примеры
Импорт класса
```js
const ClassBaseService_S = require('ClassBaseService_S');
```

Наследование от ClassBaseService_S
```js
constructor({ _busList, _node }) {
    super({ _name: '<service_name>', _busNameList: BUS_NAMES_LIST, _busList, _node });
    // ...
}
// Инициализация службы
const service = new ClassBaseService_S(serviceOpts);
```

Подписка на события шин:

```js
this.FillEventOnList('sysBus', 'all-init0', 'all-init1', 'all-close');
this.FillEventOnList('lhpBus', 'all-get-data-raw');
```

**Отправка сообщения на шину с ожиданием ответа:**

```js
const msg = {
    com: 'getData',
    dest: 'proc',
    arg: ['param1', 'param2']
};
const options = { timeout: 5000 };

```

</div>



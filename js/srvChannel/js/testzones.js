const indexes = { redLow: 0, yelLow: 1, green: 2, yelHigh: 3, redHigh: 4 };
/**
 * @class
 * Реализует функционал для работы с зонами и алармами 
 * Хранит в себе заданные границы алармов и соответствующие им колбэки.
 * Границы желтой и красной зон определяются вручную, а диапазон зеленой зоны фактически подстраивается под желтую (или красную если желтая не определена).
 * 
 */
class ClassAlarms {
    /**
     * @constructor
     * @param {ClassChannel_S} _channel 
     */
    constructor(_channel) {
        this._Channel = _channel;   // ссылка на объект сенсора
        this._CurrZone = 'green';
        this.SetDefault();
    }
    /**
     * @getter 
     * Возвращает объект, в котором ключ - имя зоны, а значение 0 или 1.  
     */
    get ZonesState() {
        const list = { redLow: 0, yelLow: 0, green: 0, yelHigh: 0, redHigh: 0 };
        list[this._CurrZone] = 1;
        return list;
    }
    /**
     * @getter
     * @public
     * @description Имя текущей зоны  redLow | yelLow | green | yelHigh | redHigh
     */
    get CurrZone() {
        return this._CurrZone;
    }
    /**
     * @method
     * @public
     * @description Устанавливает коллбэк, который вызывается для уведомления канала о смене текущей зоны
     * @param {Function} _cb 
     */
    SetChannelCb(_cb) {
        this._ChannelCb = _cb;
    }
    /**
     * @method
     * Устанавливает значения полей класса по-умолчанию
     */
    SetDefault() {
        this._Zones = [];
        this._Callbacks = new Array(5).fill((ch, z) => { });
        this._CurrZone = 'green';
    }
    /**
     * @method
     * Устанавливает новый колбэк если он верно передан.
     * Метод не предназначен для вызова пользователем.
     * @param {Number} _ind 
     * @param {Function} _cb 
     * @returns 
     */
    SetCallback(_ind, _cb) {
        if (typeof _cb === 'function') {
            this._Callbacks[_ind] = _cb;
            return true;
        }
        return false;
    }
    /**
     * @method
     * Метод, который задает зоны измерения и их функции-обработчики
     * @param {ZonesOpts} _opts 
     */
    SetZones(_opts) {
        if (!_opts) return false;

        if (!this.CheckOpts(_opts)) return false;

        if (_opts.yellow) {
            this._Zones[indexes.yelLow] = _opts.yellow.low;
            this._Zones[indexes.yelHigh] = _opts.yellow.high;
        }
        if (_opts.red) {
            this._Zones[indexes.redLow] = _opts.red.low;
            this._Zones[indexes.redHigh] = _opts.red.high;
        }
    }
    /**
     * @method
     * Проверяет корректность переданных настроек зон измерения и алармов
     * @param {ZonesOpts} opts 
     * @returns 
     */
    CheckOpts(opts) {
        let yellow = opts.yellow;
        let red = opts.red;

        if (yellow) {
            if (yellow.low >= yellow.high)                            //если нижняя граница выше верхней
                return false;
            if (opts.red) {                         //если переданы настройки красной зоны, сравниваем с ними
                if (yellow.low < red.low || yellow.high > red.high)
                    return false;
            }                                       //иначе сравниваем с текущими значениями
            else if (yellow.low < this._Zones[indexes.redLow] || yellow.high > this._Zones[indexes.redHigh])
                return false;
        }
        if (red) {
            if (red.low >= red.high)                //если нижняя граница выше верхней
                return false;

            if (!yellow) {                          //если не переданы настройки желтой зоны, сравниваем с текущими
                if (opts.red.low > this._Zones[indexes.yelLow] || opts.red.high < this._Zones[indexes.yelHigh])
                    return false;
            }
        }
        return true;
    }
    /**
     * @method
     * Метод обновляет значение текущей зоны измерения по переданному значению и, если зона сменилась, вызывает её колбэк
     * @param {Number} val 
     */
    CheckZone(val) {
        let prevZone = this._CurrZone;
        this._CurrZone = val < this._Zones[indexes.redLow] ? 'redLow'
            : val > this._Zones[indexes.redHigh] ? 'redHigh'
                : val < this._Zones[indexes.yelLow] ? 'yelLow'
                    : val > this._Zones[indexes.yelHigh] ? 'yelHigh'
                        : 'green';

        if (prevZone !== this._CurrZone) {
            this._ChannelCb?.();
            this._Callbacks[indexes[this._CurrZone]](this._Channel, prevZone);
        }
    }
}

let alarm = new ClassAlarms();

console.log(alarm.SetZones({ red: { low: 1, high: 1.01}}));
console.log(alarm.CurrZone);
alarm.CheckZone(1);
console.log(alarm.CurrZone);
alarm.CheckZone(0);
console.log(alarm.CurrZone);
alarm.CheckZone(1);
console.log(alarm.CurrZone);
// Заглушки для функций
class ClassTransform {
    #_TransformFunc;
    constructor(_opts) {
        if (typeof _opts?.k == 'number' && typeof _opts?.b == 'number')
            this.SetLinearFunc(_opts.k, _opts.b);
        else
            this.#_TransformFunc = (x) => x;
    }
    /**
     * @method
     * Задает функцию, которая будет трансформировать вх.значения.
     * @param {Function} _func 
     * @returns 
     */
    SetFunc(_func) {
        if (!_func) {
            this.#_TransformFunc = (x) => x;
            return true;
        }
        if (typeof _func !== 'function') return false;
        this.#_TransformFunc = _func;
        return true;
    }
    /**
     * @method
     * Устанавливает коэффициенты k и b трансформирующей линейной функции 
     * @param {Number} _k 
     * @param {Number} _b 
     */
    SetLinearFunc(_k, _b) {
        if (typeof _k !== 'number' || typeof _b !== 'number') throw new Error('k and b must be values');
        this.#_TransformFunc = (x) => _k * x + _b;
        return true;
    }
    /**
     * @method
     * Возвращает значение, преобразованное линейной функцией
     * @param {Number} val 
     * @returns 
     */
    TransformValue(val) {
        return this.#_TransformFunc(val);
    }
}
/**
 * @class
 * Класс реализует функционал супрессии вх. данных
 */
class ClassSuppression {
    constructor(_opts) {
        this._Low = -Infinity;
        this._High = Infinity;
        if (_opts)
            this.SetLim(_opts.low, _opts.high);
    }
    /**
     * @method
     * Метод устанавливает границы супрессорной функции
     * @param {Number} _limLow 
     * @param {Number} _limHigh 
     */
    SetLim(_limLow, _limHigh) {
        if (typeof _limLow !== 'number' || typeof _limHigh !== 'number') throw new Error('Not a number');

        if (_limLow >= _limHigh) throw new Error('limLow value should be less than limHigh');
        this._Low = _limLow;
        this._High = _limHigh;
        return true;
    }
    /**
     * @method
     * Метод возвращает значение, прошедшее через супрессорную функцию
     * @param {Number} _val 
     * @returns {Number}
     */
    SuppressValue(_val) {
        return _val > this._High ? this._High
            : _val < this._Low ? this._Low
                : _val;
    }
}

const EmitEvents_logger_log = (data) => {
    console.log(`LOG [${data.level}]: ${data.msg}`, data.obj || '');
};

// Константы
const VALUE_TYPE_NUMBER = 'number';
const VALUE_TYPE_STRING = 'string';

// Основная функция
function setValue(_val, options = {}) {
    // Локальные переменные (вместо полей класса)
    const {
        ValueType = VALUE_TYPE_STRING,
        _Bypass = false,
        ValueKey = null,
        Status = 'ACTIVE',
        Transform,
        Suppression
    } = options;

    let val;
    
    // if (Status != 'STATUS_ACTIVE') return null;
    // if (ValueType == VALUE_TYPE_NUMBER && typeof _val != 'number') return null;
    
    // Нужно изъять поле из JSON
    if (ValueKey) {
        try {
            val = (typeof _val == 'string') ? JSON.parse(_val)[ValueKey] : _val[ValueKey];
        } catch {
            EmitEvents_logger_log({ 
                level: 'E', 
                msg: `Failed to extract "${ValueKey}" from ${_val}`, 
                obj: _val 
            });
        }
    }
    
    // Нужно обработать как число
    if (ValueType == VALUE_TYPE_NUMBER && !_Bypass) {
        val = Number.parseFloat(val || _val);
        const suppressedVal = Suppression.SuppressValue(val);
        const _ValueSuppressed = val === suppressedVal;
        val = Transform.TransformValue(suppressedVal);
        
        if (typeof val != 'number') {
            val = _val;
            EmitEvents_logger_log({ 
                level: 'E', 
                msg: `Failed to apply math transform to value ${_val}`, 
                obj: { ValueType, _Bypass, ValueKey }
            });
        }
    }
    
    return val;
}


const obj =  {"s":1,"t":0,"q":192,"c":1,"ai1":9999.9999,"ai_st1":0,"ai2":9999.9999,"ai_st2":0,"ai3":0.677,"ai_st3":1,"ai4":4.899,"ai_st4":1,"ai5":0.688,"ai_st5":1,"ai6":5.640,"ai_st6":1,"ai7":5.022,"ai_st7":1,"ai8":9999.9999,"ai_st8":0}

console.log('Тест с Object:', setValue(obj, { 
    _Bypass: false,
    ValueKey: 'ai4',
    ValueType: VALUE_TYPE_NUMBER, 
    Transform: new ClassTransform({ k: 0.000152, b: -5.0 }),
    Suppression: new ClassSuppression()
}));

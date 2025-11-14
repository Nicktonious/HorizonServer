// Заглушки для функций
const Suppression = {
    SuppressValue: (val) => val * 0.9 // Просто умножаем на 0.9 для примера
};

const Transform = {
    TransformValue: (val) => val * 2 + 1 // Пример трансформации: 2x + 1
};

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
        Status = 'ACTIVE'
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

// Тесты
console.log('=== ТЕСТ 1: Числовой ввод ===');
console.log('Результат:', setValue(10, { ValueType: VALUE_TYPE_NUMBER }));
// Ожидание: (10 * 0.9) * 2 + 1 = 9 * 2 + 1 = 19

console.log('\n=== ТЕСТ 2: Строковый ввод (без обработки) ===');
console.log('Результат:', setValue('hello', { ValueType: VALUE_TYPE_STRING }));
// Ожидание: 'hello'

console.log('\n=== ТЕСТ 3: JSON строка с извлечением поля ===');
const jsonString = '{"temperature": 25.5, "humidity": 60}';
console.log('Результат:', setValue(jsonString, { 
    ValueType: VALUE_TYPE_NUMBER, 
    ValueKey: 'temperature' 
}));
// Ожидание: (25.5 * 0.9) * 2 + 1 = 22.95 * 2 + 1 = 46.9

console.log('\n=== ТЕСТ 4: Bypass режим ===');
console.log('Результат:', setValue(15, { 
    ValueType: VALUE_TYPE_NUMBER, 
    _Bypass: true 
}));
// Ожидание: 15 (обход всей обработки)

console.log('\n=== ТЕСТ 5: Невалидный JSON ===');
console.log('Результат:', setValue('invalid json', { 
    ValueType: VALUE_TYPE_NUMBER, 
    ValueKey: 'temperature' 
}));
// Ожидание: Должен залогировать ошибку и вернуть NaN после обработки

console.log('\n=== ТЕСТ 6: Строка как число ===');
console.log('Результат:', setValue('42.5', { ValueType: VALUE_TYPE_NUMBER }));
// Ожидание: (42.5 * 0.9) * 2 + 1 = 38.25 * 2 + 1 = 77.5

console.log('\n=== ТЕСТ 7: JSON без нужного ключа ===');
const jsonWithoutKey = '{"humidity": 60}';
console.log('Результат:', setValue(jsonWithoutKey, { 
    ValueType: VALUE_TYPE_NUMBER, 
    ValueKey: 'temperature' 
}));
// Ожидание: undefined после извлечения, затем NaN

console.log('\n=== ТЕСТ 8: Отрицательное число ===');
console.log('Результат:', setValue(-5, { ValueType: VALUE_TYPE_NUMBER }));
// Ожидание: (-5 * 0.9) * 2 + 1 = -4.5 * 2 + 1 = -8

// Дополнительные тесты для демонстрации граничных случаев
console.log('\n=== ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ ===');

console.log('Тест с нулем:', setValue(0, { ValueType: VALUE_TYPE_NUMBER }));
// Ожидание: (0 * 0.9) * 2 + 1 = 1

console.log('Тест с очень большим числом:', setValue(1000, { ValueType: VALUE_TYPE_NUMBER }));
// Ожидание: (1000 * 0.9) * 2 + 1 = 900 * 2 + 1 = 1801

console.log('Тест с Bypass и JSON:', setValue(jsonString, { 
    _Bypass: true,
    ValueKey: 'temperature' 
}));
// Ожидание: JSON строка без обработки


const obj =  {"ai_st4":1,"ai5":0.683,"ai_st5":1,"ai6":5.641,"ai_st6":1,"ai7":5.022,"ai_st7":1,"ai8":9999.9999,"ai_st8":0}
console.log('Тест с Object:', setValue(obj, { 
    _Bypass: false,
    ValueKey: 'ai5',
    ValueType: VALUE_TYPE_NUMBER, 
}));

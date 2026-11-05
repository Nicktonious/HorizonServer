/**
 * @file busAdapter.js
 * @description Адаптер единой шины на базе EventEmitter2.
 * Оборачивает один экземпляр EventEmitter2 в Proxy, так что обращение к любому имени
 * шины ('sysBus', 'dataBus', 'logBus', 'mdbBus') прозрачно возвращает один и тот же эмиттер.
 */
const EventEmitter2 = require('eventemitter2').EventEmitter2;

/**
 * Создает изолированную единую шину для тестов.
 * @param {object} [options]
 * @param {boolean} [options.wildcard=true]
 * @param {string} [options.delimiter='.']
 * @param {number} [options.maxListeners=500]
 * @returns {object} Объект-прокси шины с дополнительными утилитами.
 */
function createSingleBus(options = {}) {
    const emitter = new EventEmitter2({
        wildcard: options.wildcard ?? true,
        delimiter: options.delimiter ?? '.',
        maxListeners: options.maxListeners ?? 500,
        verboseMemoryLeak: false
    });

    const busProxy = new Proxy(emitter, {
        get(target, prop, receiver) {
            // Прямой доступ к полям и методам самого EventEmitter2 и вспомогательным свойствам
            if (prop === 'emitter' || prop === '__isSingleBus') {
                return emitter;
            }
            if (prop === 'cleanup') {
                return () => emitter.removeAllListeners();
            }
            if (prop === 'waitFor') {
                return (event, timeout = 1000) => emitter.waitFor(event, { timeout });
            }
            if (prop in target || typeof prop === 'symbol') {
                const val = target[prop];
                return typeof val === 'function' ? val.bind(target) : val;
            }
            // Любое неизвестное имя шины ('sysBus', 'dataBus', 'logBus') возвращает сам эмиттер
            return target;
        }
    });

    return busProxy;
}

module.exports = {
    createSingleBus
};

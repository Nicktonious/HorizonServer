/**
 * @file eventSpy.js
 * @description Асинхронные утилиты ожидания и перехвата событий в шине.
 */

/**
 * Ожидает появление события на шине.
 * Использует встроенный метод .waitFor() EventEmitter2 либо промисифицированный .once().
 * @param {object} emitter - Объект шины или EventEmitter2
 * @param {string} eventName - Имя события
 * @param {number} [timeoutMs=1000] - Максимальное время ожидания в мс
 * @returns {Promise<any>} Полезная нагрузка сообщения (первый аргумент события)
 */
async function waitForEvent(emitter, eventName, timeoutMs = 1000) {
    const rawEmitter = emitter.emitter || emitter;
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : (timeoutMs?.timeoutMs ?? timeoutMs?.timeout ?? 1000);

    if (typeof rawEmitter.waitFor === 'function') {
        const res = await rawEmitter.waitFor(eventName, { timeout });
        // waitFor в EventEmitter2 возвращает массив аргументов вызова emit: [msg, ...]
        return Array.isArray(res) ? res[0] : res;
    }

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            rawEmitter.removeListener(eventName, handler);
            reject(new Error(`Timeout of ${timeout}ms exceeded waiting for event "${eventName}"`));
        }, timeout);

        function handler(msg) {
            clearTimeout(timer);
            resolve(msg);
        }

        rawEmitter.once(eventName, handler);
    });
}

/**
 * Перехватывает все сообщения по заданному событию.
 * @param {object} emitter - Объект шины
 * @param {string} eventName - Имя события
 * @returns {{ events: Array<any>, stop: Function }}
 */
function captureEvents(emitter, eventName) {
    const rawEmitter = emitter.emitter || emitter;
    const events = [];

    const handler = (msg) => {
        events.push(msg);
    };

    rawEmitter.on(eventName, handler);

    return {
        events,
        stop: () => rawEmitter.removeListener(eventName, handler)
    };
}

/**
 * Сбрасывает очередь макротасок Event Loop (setImmediate),
 * гарантируя выполнение отложенных вызовов EmitMsg.
 * @returns {Promise<void>}
 */
function flushBus() {
    return new Promise((resolve) => setImmediate(resolve));
}

module.exports = {
    waitForEvent,
    captureEvents,
    flushBus
};

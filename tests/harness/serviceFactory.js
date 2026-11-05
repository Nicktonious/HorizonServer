/**
 * @file serviceFactory.js
 * @description Фабрика быстрого создания экземпляров служб и каналов для unit-тестов.
 */
const { createSingleBus } = require('./busAdapter');

/**
 * Создает мок Node-RED узла.
 * @param {object} [overrides]
 * @returns {object}
 */
function createMockNode(overrides = {}) {
    return {
        send: () => {},
        log: () => {},
        warn: () => {},
        error: () => {},
        on: () => {},
        ...overrides
    };
}

/**
 * Создает экземпляр базовой службы фреймворка с единой шиной.
 * @param {Function} ServiceClass - Конструктор класса службы
 * @param {object} [options]
 * @param {string} [options.name]
 * @param {Array<string>} [options.busNameList]
 * @param {object} [options.bus] - Единая шина (если не передана, создается новая)
 * @param {object} [options.node]
 * @param {object} [options.extra] - Дополнительные параметры конструктора службы
 * @returns {{ service: object, bus: object }}
 */
function createTestService(ServiceClass, options = {}) {
    const bus = options.bus || createSingleBus();
    const node = options.node || createMockNode();

    const serviceOpts = {
        _name: options.name || `test-service-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        _busNameList: options.busNameList || ['sysBus', 'dataBus', 'logBus'],
        _busList: bus,
        _node: node,
        ...options.extra
    };

    const service = new ServiceClass(serviceOpts, options.extra);

    return { service, bus };
}

/**
 * Создает экземпляр канала (ClassChannel_S, ClassChannelSensor, ClassChannelActuator) с единой шиной.
 * @param {Function} ChannelClass - Конструктор класса канала
 * @param {object} [options]
 * @param {object} [options.bus] - Единая шина (если не передана, создается новая)
 * @param {Array<string>} [options.busNameList]
 * @param {object} [options.advOpts] - Опции канала (_advOpts)
 * @returns {{ channel: object, bus: object }}
 */
function createTestChannel(ChannelClass, options = {}) {
    const bus = options.bus || createSingleBus();

    const advOpts = {
        Name: `test_ch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        SourceName: 'test_source',
        ChType: 'sensor',
        ChNum: 0,
        ValueType: 'number',
        ChangeThreshold: 0,
        ...options.advOpts
    };

    const channelOpts = {
        _busList: bus,
        _busNameList: options.busNameList || ['sysBus', 'dataBus', 'logBus'],
        _advOpts: advOpts
    };

    const channel = new ChannelClass(channelOpts);

    return { channel, bus };
}

module.exports = {
    createMockNode,
    createTestService,
    createTestChannel
};

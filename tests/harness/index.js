/**
 * @file index.js
 * @description Единая точка входа тестовой оснастки (Test Harness) для HorizonServer.
 */
const { createSingleBus } = require('./busAdapter');
const { waitForEvent, captureEvents, flushBus } = require('./eventSpy');
const { createMockNode, createTestService, createTestChannel } = require('./serviceFactory');
const ClassProxyChannel = require('./TestProxyChannel');

/**
 * Создает изолированную среду тестовой оснастки для одного теста или тестового набора.
 * @param {object} [options]
 * @returns {object}
 */
function createTestHarness(options = {}) {
    const bus = createSingleBus(options);
    const services = [];
    const channels = [];

    return {
        bus,
        createChannel: (ChannelClass, advOpts = {}) => {
            const ch = createTestChannel(ChannelClass, { bus, advOpts }).channel;
            channels.push(ch);
            return ch;
        },
        createService: (ServiceClass, serviceOpts = {}) => {
            const srv = createTestService(ServiceClass, { bus, ...serviceOpts }).service;
            services.push(srv);
            return srv;
        },
        waitForEvent: (eventName, timeoutMs = 1000) => {
            return waitForEvent(bus, eventName, timeoutMs);
        },
        captureEvents: (eventName) => {
            return captureEvents(bus, eventName);
        },
        flushBus,
        cleanup: () => {
            for (const s of services) {
                try {
                    s.HandlerEvents_all_close?.('all-close', {});
                } catch (_) {}
            }
            for (const c of channels) {
                try {
                    c.HandlerEvents_all_close?.('all-close', {});
                } catch (_) {}
            }
            bus.cleanup();
        }
    };
}

module.exports = {
    createTestHarness,
    createSingleBus,
    createTestChannel,
    createTestService,
    createMockNode,
    ClassProxyChannel,
    waitForEvent,
    captureEvents,
    flushBus
};

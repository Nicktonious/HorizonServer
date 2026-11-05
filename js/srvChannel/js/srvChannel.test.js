/**
 * @file srvChannel.test.js
 * @description Эталонный модульный тест для ClassChannel_S на базе node:test и тестовой оснастки.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const sleep = require('node:timers/promises').setTimeout;
const { createTestHarness } = require('../harness');
const ClassChannel_S = require('../../js/srvChannel/js/srvChannel');

test('ClassChannel_S: Базовая инициализация и флаги статуса', () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'temp_1',
        SourceName: 'broker_1'
    });

    assert.equal(channel.Enabled, true, 'Канал должен быть включен по умолчанию');
    assert.equal(channel.SourceConnected, true, 'Источник должен считаться подключенным по умолчанию');
    assert.equal(channel.Active, true, 'Результирующий статус active должен быть true');

    const statusObj = channel.Status;
    assert.deepEqual(statusObj, {
        enabled: true,
        sourceConnected: true,
        active: true
    }, 'Геттер Status должен возвращать объект со всеми тремя флагами');

    harness.cleanup();
});

test('ClassChannel_S: Отключение источника переводит канал в active: false и отправляет all-ch-status-get', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'temp_2',
        SourceName: 'broker_2'
    });

    const statusPromise = harness.waitForEvent('all-ch-status-get');

    // Симулируем событие шины об отключении источника
    channel.HandlerEvents_all_source_disconnected('all-source-disconnected', {
        arg: ['broker_2']
    });

    const statusMsg = await statusPromise;

    assert.equal(channel.SourceConnected, false, 'sourceConnected должен стать false');
    assert.equal(channel.Active, false, 'active должен стать false');
    assert.deepEqual(statusMsg.value[0], {
        enabled: true,
        sourceConnected: false,
        active: false
    }, 'Событие all-ch-status-get должно содержать корректный объект статусов');

    harness.cleanup();
});

test('ClassChannel_S: Зеркальное подключение источника (all-source-connected) идемпотентно восстанавливает active', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'temp_3',
        SourceName: 'broker_3'
    });

    // Сначала отключаем
    channel.HandlerEvents_all_source_disconnected('all-source-disconnected', {
        arg: ['broker_3']
    });
    await harness.flushBus();
    assert.equal(channel.Active, false);

    // Подключаем обратно через зеркальный обработчик
    const statusPromise = harness.waitForEvent('all-ch-status-get');

    channel.HandlerEvents_all_source_connected('all-source-connected', {
        arg: ['broker_3']
    });

    const statusMsg = await statusPromise;

    assert.equal(channel.SourceConnected, true, 'sourceConnected должен стать true');
    assert.equal(channel.Active, true, 'active должен стать true');
    assert.deepEqual(statusMsg.value[0], {
        enabled: true,
        sourceConnected: true,
        active: true
    });

    harness.cleanup();
});

test('ClassChannel_S: Ручное выключение/включение пользователем (all-ch-status-set)', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'temp_4',
        SourceName: 'broker_4'
    });

    // Пользователь отключает канал командой
    channel.HandlerEvents_all_ch_status_set('all-ch-status-set', {
        arg: ['temp_4'],
        value: [false]
    });

    let statusMsg = await harness.waitForEvent('all-ch-status-get');

    assert.equal(channel.Enabled, false, 'enabled должен стать false');
    assert.equal(channel.Active, false, 'active должен стать false');
    assert.deepEqual(statusMsg.value[0], {
        enabled: false,
        sourceConnected: true,
        active: false
    });

    await sleep(100); 

    // Пользователь включает канал командой
    channel.HandlerEvents_all_ch_status_set('all-ch-status-set', {
        arg: ['temp_4'],
        value: [true]
    });

    statusMsg = await harness.waitForEvent('all-ch-status-get');

    assert.equal(channel.Enabled, true, 'enabled должен стать true');
    assert.equal(channel.Active, true, 'active должен стать true');
    assert.deepEqual(statusMsg.value[0], {
        enabled: true,
        sourceConnected: true,
        active: true
    });

    harness.cleanup();
});

test('ClassChannel_S: Блокировка сообщений на dataBus при active === false', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'temp_5',
        SourceName: 'broker_5'
    });

    // Отключаем канал
    channel.HandlerEvents_all_source_disconnected('all-source-disconnected', {
        arg: ['broker_5']
    });
    await harness.flushBus();
    assert.equal(channel.Active, false);

    // Пытаемся отправить данные в dataBus
    let dataReceived = false;
    harness.bus.on('all-data-fine-set', () => {
        dataReceived = true;
    });

    const sendResult = await channel.EmitMsg('dataBus', 'all-data-fine-set', {
        dest: 'all',
        com: 'all-data-fine-set',
        value: [100]
    });

    await harness.flushBus();

    assert.equal(sendResult, false, 'EmitMsg в dataBus должен вернуть false при inactive');
    assert.equal(dataReceived, false, 'Сообщение не должно поступить в шину dataBus');

    harness.cleanup();
});

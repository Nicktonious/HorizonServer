const test = require('node:test');
const assert = require('node:assert/strict');
const sleep = require('node:timers/promises').setTimeout;
const { createTestHarness } = require('#harness');
const ClassChannel_S = require('#js/srvChannel/js/srvChannel');

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

test('ClassChannel_S: SetupMathChannel и ToConfig с буфером усреднения и фильтром', () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'math_1',
        SourceName: 'virtual',
        Config: {
            buffer: { size: 5 },
            filter: { size: 3, func: arr => arr[arr.length - 1] },
            transform: { k: 2, b: 10 },
            suppression: { low: 0, high: 100 }
        }
    });

    assert.deepEqual(channel.ToConfig().buffer, { size: 5 });
    assert.deepEqual(channel.ToConfig().filter, { size: 3 });
    assert.deepEqual(channel.ToConfig().suppression, { limLow: 0, limHigh: 100 });
    assert.equal(channel.Transform.TransformValue(5), 20);
    assert.equal(channel.Suppression.SuppressValue(-5), 0);
    assert.equal(channel.Suppression.SuppressValue(150), 100);

    // Без Config.filter фильтр должен оставаться null
    channel.SetupMathChannel({ buffer: { size: 2 } });
    assert.equal(channel.Filter, null, 'Без Config.filter поле Filter должно быть null');
    assert.equal(channel.ToConfig().filter, undefined);

    harness.cleanup();
});

test('ClassChannel_S: ClassAlarms проверяет зоны и отправляет all-ch-alarm при смене зоны', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'alarm_1',
        SourceName: 'virtual',
        Config: {
            zones: {
                red: { low: 0, high: 100 },
                yellow: { low: 10, high: 90 }
            }
        }
    });

    const alarmEvents = harness.captureEvents('all-ch-alarm');

    channel.Alarms.CheckZone(50); // green -> без события
    assert.equal(channel.Alarms.CurrZone, 'green');

    channel.Alarms.CheckZone(95); // green -> yelHigh
    assert.equal(channel.Alarms.CurrZone, 'yelHigh');

    channel.Alarms.CheckZone(110); // yelHigh -> redHigh
    assert.equal(channel.Alarms.CurrZone, 'redHigh');

    channel.Alarms.CheckZone(-5); // redHigh -> redLow
    assert.equal(channel.Alarms.CurrZone, 'redLow');

    await harness.flushBus();
    alarmEvents.stop();

    assert.equal(alarmEvents.events.length, 3, 'Должно быть отправлено 3 события смены зоны');
    assert.deepEqual(alarmEvents.events.at(-1).value[0], {
        redLow: 1,
        yelLow: 0,
        green: 0,
        yelHigh: 0,
        redHigh: 0
    });

    harness.cleanup();
});

test('ClassChannel_S: Команда all-ch-config-set переконфигурирует канал и отправляет all-ch-config-get', async () => {
    const harness = createTestHarness();

    const channel = harness.createChannel(ClassChannel_S, {
        Name: 'cfg_ch_1',
        SourceName: 'virtual'
    });

    const configPromise = harness.waitForEvent('all-ch-config-get');

    channel.HandlerEvents_all_ch_config_set('all-ch-config-set', {
        metadata: { hash: 'test-hash-1' },
        arg: ['cfg_ch_1'],
        value: [{
            buffer: { size: 4 },
            filter: { size: 2 },
            suppression: { low: -10, high: 10 }
        }]
    });

    const configMsg = await configPromise;
    assert.equal(configMsg.arg[0], 'cfg_ch_1');
    assert.deepEqual(configMsg.value[0].buffer, { size: 4 });
    assert.deepEqual(configMsg.value[0].filter, { size: 2 });
    assert.deepEqual(configMsg.value[0].suppression, { limLow: -10, limHigh: 10 });

    harness.cleanup();
});

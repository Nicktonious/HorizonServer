const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestHarness } = require('#harness');
const ClassChannelSensor = require('#js/srvSensorChannel/js/srvChannelSensor');

test('ClassChannelSensor: Раздельная работа фильтра и буфера усреднения', () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_math_1',
        SourceName: 'virtual',
        Config: {
            buffer: { size: 3 },
            // Медианный фильтр на 3 элемента
            filter: {
                size: 3,
                func: arr => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]
            }
        }
    });

    sensor.Value = 10;
    sensor.Value = 100; // выброс
    sensor.Value = 12;

    // Медиана [10, 100, 12] = 12
    assert.equal(sensor.Value, 12);
    // В буфер усреднения попали отфильтрованные значения: [10, 100, 12] -> среднее 122/3
    assert.ok(Math.abs(sensor.Buffer.Filter() - 122 / 3) < 1e-9);

    harness.cleanup();
});

test('ClassChannelSensor: Без Config.filter фильтрация не применяется, работает только усреднение', () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_nofilter_1',
        SourceName: 'virtual',
        Config: {
            buffer: { size: 2 }
        }
    });

    assert.equal(sensor.Filter, null);

    sensor.Value = 10;
    sensor.Value = 20;

    assert.equal(sensor.Value, 20);
    assert.equal(sensor.Buffer.Filter(), 15);

    harness.cleanup();
});

test('ClassChannelSensor: Хранение ValueMin, ValueMax и ResetMinMax', () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_minmax_1',
        SourceName: 'virtual'
    });

    sensor.Value = 15;
    sensor.Value = -5;
    sensor.Value = 42;
    sensor.Value = 10;

    assert.equal(sensor.ValueMin, -5);
    assert.equal(sensor.ValueMax, 42);

    sensor.ResetMinMax();
    assert.equal(sensor.ValueMin, 10);
    assert.equal(sensor.ValueMax, 10);

    harness.cleanup();
});

test('ClassChannelSensor: Цепочка Suppression -> Transform и извлечение по ValueKey', () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_proc_1',
        SourceName: 'virtual',
        ValueKey: 'temp',
        Config: {
            suppression: { low: 0, high: 50 },
            transform: { k: 2, b: 1 }
        }
    });

    sensor.Value = JSON.stringify({ temp: 100 }); // подавится до 50, затем 50*2 + 1 = 101
    assert.equal(sensor.Value, 101);
    assert.equal(sensor._ValueSuppressed, true);

    sensor.Value = { temp: 20 }; // в пределах [0, 50], затем 20*2 + 1 = 41
    assert.equal(sensor.Value, 41);
    assert.equal(sensor._ValueSuppressed, false);

    harness.cleanup();
});

test('ClassChannelSensor: ChangeThreshold ограничивает отправку all-data-fine-set', async () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_thresh_1',
        SourceName: 'virtual',
        ChangeThreshold: 10 // 10%
    });

    const spy = harness.captureEvents('all-data-fine-set');

    sensor.Value = 100; // первое значение (prevValue undefined -> NaN -> отправляется)
    sensor.Value = 105; // изменение 5% <= 10% -> НЕ отправляется
    sensor.Value = 120; // изменение 20% > 10% -> отправляется

    await harness.flushBus();
    spy.stop();

    assert.equal(spy.events.length, 2);
    assert.equal(spy.events[0].value[0].Value, 100);
    assert.equal(spy.events[1].value[0].Value, 120);
    assert.equal(spy.events[1].value[0].ValueMin, 100);
    assert.equal(spy.events[1].value[0].ValueMax, 120);

    harness.cleanup();
});

test('ClassChannelSensor: Адресный обработчик <Name>-data-raw-get и совместимость с all-data-raw-get', async () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'dev1-ch0',
        SourceName: 'virtual'
    });

    sensor.HandlerEvents_all_init_stage1_set('all-init-stage1-set', {
        arg: [{ ServicesState: { 'dev1-ch0': {} }, SourcesState: {} }]
    });

    // 1. Адресное событие <Name>-data-raw-get через шину
    harness.bus.emit('dev1-ch0-data-raw-get', {
        metadata: {},
        arg: ['virtual'],
        value: [{ arg: ['dev1-ch0'], value: [25] }]
    });
    await harness.flushBus();
    assert.equal(sensor.Value, 25);

    // 2. Устаревшее событие all-data-raw-get (совместимость)
    harness.bus.emit('all-data-raw-get', {
        metadata: {},
        arg: ['virtual'],
        value: [{ arg: ['dev1-ch0'], value: [30] }]
    });
    await harness.flushBus();
    assert.equal(sensor.Value, 30);

    // 3. Сообщение для другого канала/источника игнорируется
    harness.bus.emit('all-data-raw-get', {
        metadata: {},
        arg: ['other_source'],
        value: [{ arg: ['dev1-ch0'], value: [999] }]
    });
    await harness.flushBus();
    assert.equal(sensor.Value, 30);

    harness.cleanup();
});

test('ClassChannelSensor: Запрос all-data-fine-get публикует текущее значение', async () => {
    const harness = createTestHarness();

    const sensor = harness.createChannel(ClassChannelSensor, {
        Name: 'sensor_get_1',
        SourceName: 'virtual'
    });

    sensor.HandlerEvents_all_init_stage1_set('all-init-stage1-set', {
        arg: [{ ServicesState: { sensor_get_1: {} }, SourcesState: {} }]
    });

    sensor.Value = 55;
    await harness.flushBus();

    const finePromise = harness.waitForEvent('all-data-fine-get');
    const fineSetPromise = harness.waitForEvent('all-data-fine-set');

    harness.bus.emit('all-data-fine-get', {
        metadata: {},
        arg: ['sensor_get_1']
    });

    await finePromise;
    const fineSetMsg = await fineSetPromise;

    assert.equal(fineSetMsg.arg[0], 'sensor_get_1');
    assert.equal(fineSetMsg.value[0].Value, 55);

    harness.cleanup();
});

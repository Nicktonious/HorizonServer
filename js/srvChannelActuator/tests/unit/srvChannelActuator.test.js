const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestHarness } = require('#harness');
const ClassChannelActuator = require('#js/srvChannelActuator/js/srvChannelActuator');

test('ClassChannelActuator: SetValue без ValueConfirm сразу обновляет Value и шлет all-data-fine-set', async () => {
    const harness = createTestHarness();

    const actuator = harness.createChannel(ClassChannelActuator, {
        Name: 'act_no_confirm_1',
        SourceName: 'virtual',
        ValueConfirm: false
    });

    actuator.SetupMathChannel({
        suppression: { low: 0, high: 100 },
        transform: { k: 1, b: 5 }
    });

    const finePromise = harness.waitForEvent('all-data-fine-set');
    actuator.SetValue(150); // подавится до 100, затем 100 + 5 = 105

    const fineMsg = await finePromise;
    assert.equal(actuator.Value, 105);
    assert.equal(fineMsg.arg[0], 'act_no_confirm_1');
    assert.equal(fineMsg.value[0].Value, 105);

    harness.cleanup();
});

test('ClassChannelActuator: ValueConfirm = true ожидает подтверждения через <Name>-data-raw-get и all-data-raw-get', async () => {
    const harness = createTestHarness();

    const actuator = harness.createChannel(ClassChannelActuator, {
        Name: 'act-confirm-1',
        SourceName: 'virtual',
        ValueConfirm: true
    });

    actuator.HandlerEvents_all_init_stage1_set('all-init-stage1-set', {
        arg: [{ ServicesState: { 'act-confirm-1': {} }, SourcesState: {} }]
    });

    // SetValue не должен сразу менять Value при ValueConfirm = true
    const spy = harness.captureEvents('all-data-fine-set');
    actuator.SetValue(50);
    await harness.flushBus();
    assert.equal(actuator.Value, undefined);
    assert.equal(spy.events.length, 0);

    // Адресное подтверждение <Name>-data-raw-get
    harness.bus.emit('act-confirm-1-data-raw-get', {
        metadata: {},
        arg: ['virtual'],
        value: [{ arg: ['act-confirm-1'], value: [50] }]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, 50);
    assert.equal(spy.events.length, 1);
    assert.equal(spy.events[0].value[0].Value, 50);

    // Обратная совместимость с all-data-raw-get
    harness.bus.emit('all-data-raw-get', {
        metadata: {},
        arg: ['virtual'],
        value: [{ arg: ['act-confirm-1'], value: [75] }]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, 75);
    assert.equal(spy.events.length, 2);
    assert.equal(spy.events[1].value[0].Value, 75);

    spy.stop();
    harness.cleanup();
});

test('ClassChannelActuator: Команда all-actuator-set обновляет свой канал и игнорирует чужой', async () => {
    const harness = createTestHarness();

    const actuator = harness.createChannel(ClassChannelActuator, {
        Name: 'act_cmd_1',
        SourceName: 'virtual'
    });

    actuator.HandlerEvents_all_actuator_set('all-actuator-set', {
        arg: ['other_act'],
        value: [99]
    });
    assert.equal(actuator.Value, undefined);

    actuator.HandlerEvents_all_actuator_set('all-actuator-set', {
        arg: ['act_cmd_1'],
        value: [33]
    });
    assert.equal(actuator.Value, 33);

    harness.cleanup();
});

test('ClassChannelActuator: Реакция на StateChName (all-data-fine-set) и запрос all-data-fine-get', async () => {
    const harness = createTestHarness();

    const actuator = harness.createChannel(ClassChannelActuator, {
        Name: 'act_state_1',
        SourceName: 'virtual',
        StateChName: 'sensor_state_1'
    });

    actuator.HandlerEvents_all_init_stage1_set('all-init-stage1-set', {
        arg: [{ ServicesState: { act_state_1: {} }, SourcesState: {} }]
    });

    // Игнорируется, если ValueSuppressed = true
    harness.bus.emit('all-data-fine-set', {
        metadata: {},
        arg: ['sensor_state_1'],
        value: [{ Value: 10, ValueSuppressed: true }]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, undefined);

    // Применяется, если ValueSuppressed = false
    harness.bus.emit('all-data-fine-set', {
        metadata: {},
        arg: ['sensor_state_1'],
        value: [{ Value: 22, ValueSuppressed: false }]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, 22);

    // Запрос all-data-fine-get
    const spy = harness.captureEvents('all-data-fine-set');
    harness.bus.emit('all-data-fine-get', {
        metadata: {},
        arg: ['act_state_1']
    });
    await harness.flushBus();
    spy.stop();

    assert.equal(spy.events.length, 1);
    assert.equal(spy.events[0].value[0].Value, 22);

    harness.cleanup();
});

test('ClassChannelActuator: Адресная команда <Name>-actuator-set и совместимость с all-actuator-set через шину', async () => {
    const harness = createTestHarness();

    const actuator = harness.createChannel(ClassChannelActuator, {
        Name: 'act-addr-1',
        SourceName: 'virtual'
    });

    // Адресная команда <Name>-actuator-set через шину
    harness.bus.emit('act-addr-1-actuator-set', {
        metadata: {},
        arg: ['act-addr-1'],
        value: [64]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, 64);

    // Обратная совместимость с deprecated all-actuator-set через шину
    harness.bus.emit('all-actuator-set', {
        metadata: {},
        arg: ['act-addr-1'],
        value: [88]
    });
    await harness.flushBus();
    assert.equal(actuator.Value, 88);

    harness.cleanup();
});

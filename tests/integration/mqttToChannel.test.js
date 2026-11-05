/**
 * @file mqttToChannel.test.js
 * @description Интеграционный тест взаимодействия srvMQTTClient со службами каналов
 * ClassChannelSensor и ClassChannelActuator через единую шину событий и TestProxyChannel.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env.dev и .env
dotenv.config({ path: path.resolve(__dirname, '../../.env.dev') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { createTestHarness, ClassProxyChannel } = require('../harness');
const ClassMQTTClient_S = require('../../js/srvMQTTClient/js/srvMQTTClient');
const ClassChannelSensor = require('../../js/srvSensorChannel/js/srvChannelSensor');
const ClassChannelActuator = require('../../js/srvChannelActuator/js/srvChannelActuator');

/**
 * Вспомогательная конфигурация источника из .env.dev
 */
function createTestSourceConfig(overrides = {}) {
    return {
        Name: (process.env.MQTT_SOURCE_NAME ?? 'mqtt_source_main').trim(),
        Protocol: (process.env.MQTT_PROTOCOL ?? 'mqtt').trim(),
        IP: (process.env.MQTT_HOST ?? '127.0.0.1').trim(),
        Port: Number(process.env.MQTT_PORT ?? 1883),
        Login: process.env.MQTT_USERNAME?.trim() || undefined,
        Password: process.env.MQTT_PASSWORD?.trim() || undefined,
        ConnectOpts: {
            connectTimeout: 5000,
            reconnectPeriod: 0
        },
        IsConnected: false,
        ...overrides
    };
}

test('Интеграция: Инициализация ClassChannelSensor и ClassChannelActuator при подключении MQTT источника', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();
    let client;

    try {
        const mqttService = harness.createService(ClassMQTTClient_S, {
            extra: {
                sources: { [source.Name]: source }
            }
        });

        // Создаем сенсор и актуатор, привязанные к этому MQTT источнику
        const sensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_temp_1',
            SourceName: source.Name
        });

        const actuator = harness.createChannel(ClassChannelActuator, {
            Name: 'actuator_relay_1',
            SourceName: source.Name
        });

        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected, 'MQTT клиент должен быть подключен');

        // Проверяем начальные статусы обоих каналов
        assert.deepEqual(sensor.Status, {
            enabled: true,
            sourceConnected: true,
            active: true
        }, 'Сенсор должен иметь active: true');

        assert.deepEqual(actuator.Status, {
            enabled: true,
            sourceConnected: true,
            active: true
        }, 'Актуатор должен иметь active: true');
    } finally {
        client?.end?.(true);
        harness.cleanup();
    }
});

test('Интеграция: Обрыв связи с MQTT источником деактивирует sensor и actuator (active: false)', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();
    let client;

    try {
        const mqttService = harness.createService(ClassMQTTClient_S, {
            extra: {
                sources: { [source.Name]: source }
            }
        });

        const sensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_temp_2',
            SourceName: source.Name
        });

        const actuator = harness.createChannel(ClassChannelActuator, {
            Name: 'actuator_valve_2',
            SourceName: source.Name
        });

        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected);

        // Захватываем все статусные сообщения каналов
        const statusSpy = harness.captureEvents('all-ch-status-get');
        const disconnectPromise = harness.waitForEvent('all-source-disconnected', 10000);

        // Принудительный обрыв связи
        client.end(true);

        const disconnectMsg = await disconnectPromise;
        assert.equal(disconnectMsg.arg[0], source.Name, 'Событие обрыва должно содержать имя источника');

        // Даем микротаскам отработать
        await harness.flushBus();

        // Проверяем флаги статусов каналов
        assert.equal(sensor.SourceConnected, false, 'У сенсора sourceConnected должен стать false');
        assert.equal(sensor.Active, false, 'У сенсора active должен стать false');
        assert.equal(sensor.Enabled, true, 'У сенсора enabled должен остаться true');

        assert.equal(actuator.SourceConnected, false, 'У актуатора sourceConnected должен стать false');
        assert.equal(actuator.Active, false, 'У актуатора active должен стать false');
        assert.equal(actuator.Enabled, true, 'У актуатора enabled должен остаться true');

        // Проверяем, что оба канала опубликовали all-ch-status-get
        statusSpy.stop();
        const sensorStatusEvents = statusSpy.events.filter(e => e.arg?.[0] === 'sensor_temp_2');
        const actuatorStatusEvents = statusSpy.events.filter(e => e.arg?.[0] === 'actuator_valve_2');

        assert.ok(sensorStatusEvents.length > 0, 'Сенсор должен опубликовать all-ch-status-get при отключении');
        assert.deepEqual(sensorStatusEvents.at(-1).value[0], {
            enabled: true,
            sourceConnected: false,
            active: false
        });

        assert.ok(actuatorStatusEvents.length > 0, 'Актуатор должен опубликовать all-ch-status-get при отключении');
        assert.deepEqual(actuatorStatusEvents.at(-1).value[0], {
            enabled: true,
            sourceConnected: false,
            active: false
        });
    } finally {
        client?.end?.(true);
        harness.cleanup();
    }
});

test('Интеграция: Восстановление связи с MQTT источником восстанавливает active: true каналов', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();
    let client;

    try {
        const mqttService = harness.createService(ClassMQTTClient_S, {
            extra: {
                sources: { [source.Name]: source }
            }
        });

        const sensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_press_3',
            SourceName: source.Name
        });

        const actuator = harness.createChannel(ClassChannelActuator, {
            Name: 'actuator_motor_3',
            SourceName: source.Name
        });

        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected);

        // 1. Обрыв связи
        const disconnectPromise = harness.waitForEvent('all-source-disconnected', 10000);
        client.end(true);
        await disconnectPromise;

        assert.equal(sensor.Active, false);
        assert.equal(actuator.Active, false);

        // 2. Восстановление связи (повторное подключение источника)
        source.IsConnected = false; // сбрасываем флаг для повторного ConnectSource
        const reconnectPromise = harness.waitForEvent('all-source-connected', 10000);
        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected);

        const reconnectMsg = await reconnectPromise;
        assert.equal(reconnectMsg.arg[0], source.Name);

        // Даем шине обработать событие
        await harness.flushBus();

        // Проверяем восстановление статуса обоих каналов
        assert.equal(sensor.SourceConnected, true, 'У сенсора sourceConnected должен восстановиться в true');
        assert.equal(sensor.Active, true, 'У сенсора active должен восстановиться в true');

        assert.equal(actuator.SourceConnected, true, 'У актуатора sourceConnected должен восстановиться в true');
        assert.equal(actuator.Active, true, 'У актуатора active должен восстановиться в true');
    } finally {
        client?.end?.(true);
        harness.cleanup();
    }
});

test('Интеграция: Команда all-ch-status-set в dataBus изменяет enabled и блокирует dataBus', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();
    let client;

    try {
        const mqttService = harness.createService(ClassMQTTClient_S, {
            extra: {
                sources: { [source.Name]: source }
            }
        });

        // Создаем сервис прокси для отправки команд через dataBus
        const proxy = harness.createService(ClassProxyChannel);

        const sensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_flow_4',
            SourceName: source.Name
        });

        const actuator = harness.createChannel(ClassChannelActuator, {
            Name: 'actuator_switch_4',
            SourceName: source.Name
        });

        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected);

        // 1. Посылаем команду выключения в dataBus для сенсора через TestProxyChannel
        const sensorStatusPromise = harness.waitForEvent('all-ch-status-get', 5000);
        proxy.SetChannelStatus(sensor.Name, false);

        const sensorStatusMsg = await sensorStatusPromise;
        assert.equal(sensor.Enabled, false, 'enabled сенсора должен стать false');
        assert.equal(sensor.SourceConnected, true, 'sourceConnected должен остаться true');
        assert.equal(sensor.Active, false, 'active сенсора должен стать false');
        assert.deepEqual(sensorStatusMsg.value[0], {
            enabled: false,
            sourceConnected: true,
            active: false
        });

        // 2. Посылаем команду выключения в dataBus для актуатора через TestProxyChannel
        const actuatorStatusPromise = harness.waitForEvent('all-ch-status-get', 5000);
        proxy.SetChannelStatus(actuator.Name, false);

        const actuatorStatusMsg = await actuatorStatusPromise;
        assert.equal(actuator.Enabled, false);
        assert.equal(actuator.SourceConnected, true);
        assert.equal(actuator.Active, false);
        assert.deepEqual(actuatorStatusMsg.value[0], {
            enabled: false,
            sourceConnected: true,
            active: false
        });

        // 3. Проверка блокировки сообщений в dataBus при active === false
        // Выключенный сенсор и актуатор не могут отправлять данные в dataBus
        const dataSpy = harness.captureEvents('all-data-fine-set');
        sensor.EmitMsg('dataBus', 'all-data-fine-set', { arg: [sensor.Name], value: [42] });
        actuator.EmitMsg('dataBus', 'all-data-fine-set', { arg: [actuator.Name], value: [100] });
        await harness.flushBus();
        dataSpy.stop();
        assert.equal(dataSpy.events.length, 0, 'Сообщения на dataBus должны блокироваться при active === false');

        // 4. Посылаем команду повторного включения сенсора через TestProxyChannel
        const reEnablePromise = harness.waitForEvent('all-ch-status-get', 5000);
        proxy.SetChannelStatus(sensor.Name, true);
        await reEnablePromise;

        assert.equal(sensor.Enabled, true);
        assert.equal(sensor.Active, true);
    } finally {
        client?.end?.(true);
        harness.cleanup();
    }
});

test('Интеграция: Изоляция по имени источника', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();
    let client;

    try {
        const mqttService = harness.createService(ClassMQTTClient_S, {
            extra: {
                sources: { [source.Name]: source }
            }
        });

        // Канал, привязанный к текущему источнику
        const boundSensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_bound',
            SourceName: source.Name
        });

        // Канал, привязанный к другому источнику
        const otherSensor = harness.createChannel(ClassChannelSensor, {
            Name: 'sensor_other',
            SourceName: 'different_unrelated_broker'
        });

        client = await mqttService.ConnectSource(source);
        assert.ok(client?.connected);

        // Разрываем соединение с текущим брокером
        const disconnectPromise = harness.waitForEvent('all-source-disconnected', 10000);
        client.end(true);
        await disconnectPromise;
        await harness.flushBus();

        // Привязанный канал отключился
        assert.equal(boundSensor.SourceConnected, false);
        assert.equal(boundSensor.Active, false);

        // Сторонний канал НЕ должен пострадать
        assert.equal(otherSensor.SourceConnected, true, 'Канал другого источника не должен отключаться');
        assert.equal(otherSensor.Active, true, 'Канал другого источника должен оставаться active: true');
    } finally {
        client?.end?.(true);
        harness.cleanup();
    }
});

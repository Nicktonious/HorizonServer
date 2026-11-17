/**
 * @file srvMQTTClient.test.js
 * @description Модульный тест для ClassMQTTClient_S на базе node:test и тестовой оснастки.
 * Параметры подключения к MQTT-брокеру загружаются из .env.dev / .env и передаются в службу.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env.dev и .env
const rootDir = path.dirname(require.resolve('#root/package.json'));
dotenv.config({ path: path.join(rootDir, '.env.dev') });
dotenv.config({ path: path.join(rootDir, '.env') });

const { createTestHarness } = require('#harness');
const ClassMQTTClient_S = require('#js/srvMQTTClient/js/srvMQTTClient');

/**
 * Объект источника данных в стандартном формате фреймворка Horizon
 */
function createTestSourceConfig(overrides = {}) {
    return {
        Name: (process.env.MQTT_SOURCE_NAME ?? 'test_mqtt_broker').trim(),
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

test('ClassMQTTClient_S: Конструктор принимает sources и регистрирует источник в MQTTSources', () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();

    const mqttService = harness.createService(ClassMQTTClient_S, {
        extra: {
            sources: { [source.Name]: source }
        }
    });

    const sources = mqttService.MQTTSources;
    assert.equal(sources.length, 1, 'В MQTTSources должен быть зарегистрирован один источник');
    assert.equal(sources[0].Name, source.Name, 'Имя источника должно совпадать');
    assert.equal(sources[0].IP, source.IP, 'Хост источника должен совпадать с параметром из .env');
    assert.equal(sources[0].Port, source.Port, 'Порт источника должен совпадать с параметром из .env');
    assert.equal(sources[0].IsConnected, false, 'До подключения источник не должен быть активен');

    harness.cleanup();
});

test('ClassMQTTClient_S: Прямое подключение через ConnectSource() эмиттирует all-source-connected', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();

    const mqttService = harness.createService(ClassMQTTClient_S, {
        extra: {
            sources: { [source.Name]: source }
        }
    });

    const connectedPromise = harness.waitForEvent('all-source-connected', 10000);

    // Прямой вызов публичного метода подключения
    const client = await mqttService.ConnectSource(source);

    assert.ok(client, 'Клиент должен быть успешно создан');
    assert.equal(client.connected, true, 'Клиент должен находиться в состоянии connected');

    const connectedMsg = await connectedPromise;
    assert.ok(connectedMsg, 'Событие all-source-connected должно быть сгенерировано на шине');
    assert.equal(connectedMsg.arg[0], source.Name, 'Аргумент события должен содержать имя источника');

    client.end(true);
    harness.cleanup();
});

test('ClassMQTTClient_S: Инициализация через HandlerEvents_all_init_stage1_set подключает источники и шлет all-connections-done', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();

    const mqttService = harness.createService(ClassMQTTClient_S, {
        extra: {
            sources: { [source.Name]: source }
        }
    });

    const connectedPromise = harness.waitForEvent('all-source-connected', 10000);
    const donePromise = harness.waitForEvent('all-connections-done', 10000);

    // Инициализация первой стадии
    await mqttService.HandlerEvents_all_init_stage1_set('all-init-stage1-set', {
        arg: [{ ServicesState: { mqttclient: {} } }]
    });

    const connectedMsg = await connectedPromise;
    assert.ok(connectedMsg, 'Событие all-source-connected должно быть сгенерировано');
    assert.equal(connectedMsg.arg[0], source.Name);

    const doneMsg = await donePromise;
    assert.ok(doneMsg, 'Событие all-connections-done должно быть сгенерировано');
    assert.ok(doneMsg.arg.includes(source.Name), 'all-connections-done должно содержать имя источника');

    mqttService.Clients[source.Name]?.end(true);
    harness.cleanup();
});

test('ClassMQTTClient_S: Подписка на топик и получение сообщений в proxymqttclient-msg-get', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();

    const mqttService = harness.createService(ClassMQTTClient_S, {
        extra: {
            sources: { [source.Name]: source }
        }
    });

    await mqttService.ConnectSource(source);

    const testTopic = `test/topic/${Date.now()}`;
    const testPayload = JSON.stringify({ message: 'hello-horizon', timestamp: Date.now() });

    const msgPromise = harness.waitForEvent('proxymqttclient-msg-get', 10000);

    // Подписываемся на топик
    await mqttService.HandlerEvents_mqttclient_sub('mqttclient-sub', {
        arg: [source.Name],
        value: [testTopic]
    });

    // Публикуем сообщение в топик
    mqttService.HandlerEvents_mqttclient_send('mqttclient-send', {
        arg: [source.Name],
        value: [testTopic, testPayload]
    });

    const receivedMsg = await msgPromise;
    assert.ok(receivedMsg, 'Должно быть получено сообщение proxymqttclient-msg-get');
    assert.equal(receivedMsg.arg[0], source.Name, 'Имя источника должно совпадать');
    assert.equal(receivedMsg.value[0], testTopic, 'Топик должен совпадать');
    assert.equal(receivedMsg.value[1], testPayload, 'Полезная нагрузка должна совпадать');

    mqttService.Clients[source.Name]?.end(true);
    harness.cleanup();
});

test('ClassMQTTClient_S: При разрыве соединения эмиттируется all-source-disconnected', async () => {
    const harness = createTestHarness();
    const source = createTestSourceConfig();

    const mqttService = harness.createService(ClassMQTTClient_S, {
        extra: {
            sources: { [source.Name]: source }
        }
    });

    const client = await mqttService.ConnectSource(source);
    assert.ok(client, 'Клиент должен быть подключен');

    const disconnectPromise = harness.waitForEvent('all-source-disconnected', 10000);

    // Закрываем клиент принудительно
    client.end(true);

    const disconnectMsg = await disconnectPromise;
    assert.ok(disconnectMsg, 'Событие all-source-disconnected должно быть получено');
    assert.equal(disconnectMsg.arg[0], source.Name, 'В событии должно быть имя отключенного источника');

    harness.cleanup();
});

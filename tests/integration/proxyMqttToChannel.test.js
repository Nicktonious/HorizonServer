/**
 * @file proxyMqttToChannel.test.js
 * @description Интеграционный тест маршрутизации сообщений от srvProxyMQTT к сенсорному
 * и актуаторному каналам через адресную команду <chName>-data-raw-get.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestHarness } = require('#harness');
const ClassProxyMQTTClient_S = require('#js/srvProxyMQTTClient/js/srvProxyMQTT');
const ClassChannelSensor = require('#js/srvSensorChannel/js/srvChannelSensor');
const ClassChannelActuator = require('#js/srvChannelActuator/js/srvChannelActuator');

test('Интеграция: srvProxyMQTT отправляет <chName>-data-raw-get, а sensor и actuator принимают его', async () => {
    const harness = createTestHarness();
    const sourceName = 'mqtt_src_1';
    const sensorName = 'mqtt_src_1-dev1-0';
    const actuatorName = 'mqtt_src_1-dev1-1';

    try {
        const proxyMqtt = harness.createService(ClassProxyMQTTClient_S);

        const sensor = harness.createChannel(ClassChannelSensor, {
            Name: sensorName,
            SourceName: sourceName,
            DeviceId: 'dev1',
            ChNum: 0,
            ValueType: 'number'
        });

        const actuator = harness.createChannel(ClassChannelActuator, {
            Name: actuatorName,
            SourceName: sourceName,
            DeviceId: 'dev1',
            ChNum: 1,
            ValueType: 'number',
            ValueConfirm: true
        });

        const initMsg = {
            arg: [{
                ServicesState: {
                    proxymqttclient: { Name: 'proxymqttclient', Protocol: 'mqtt', PrimaryBus: 'mqttBus' },
                    [sensorName]: { Name: sensorName },
                    [actuatorName]: { Name: actuatorName }
                },
                SourcesState: {
                    [sourceName]: { Name: sourceName, Protocol: 'mqtt' }
                }
            }]
        };

        sensor.AddBusList(['mqttBus']);
        actuator.AddBusList(['mqttBus']);

        proxyMqtt.HandlerEvents_all_init_stage1_set('all-init-stage1-set', initMsg);
        sensor.HandlerEvents_all_init_stage1_set('all-init-stage1-set', initMsg);
        actuator.HandlerEvents_all_init_stage1_set('all-init-stage1-set', initMsg);

        // Регистрируем маппинг MQTT-топиков на каналы
        proxyMqtt.HandlerEvents_proxymqttclient_sub_sensorall('proxymqttclient-sub-sensorall', {
            arg: [sourceName],
            value: [{
                sensor: [{ name: sensorName, address: 'devices/dev1/temp' }],
                actuator: [{ name: actuatorName, address: 'devices/dev1/valve/state' }]
            }]
        });

        const legacySpy = harness.captureEvents('all-data-raw-get');
        const sensorRawSpy = harness.captureEvents(`${sensorName}-data-raw-get`);
        const actuatorRawSpy = harness.captureEvents(`${actuatorName}-data-raw-get`);
        const fineSpy = harness.captureEvents('all-data-fine-set');

        // Имитируем приход сообщений от MQTT-клиента в srvProxyMQTT
        proxyMqtt.HandlerEvents_proxymqttclient_msg_get('proxymqttclient-msg-get', {
            arg: [sourceName],
            value: ['devices/dev1/temp', 24.5]
        });
        proxyMqtt.HandlerEvents_proxymqttclient_msg_get('proxymqttclient-msg-get', {
            arg: [sourceName],
            value: ['devices/dev1/valve/state', 80]
        });

        await harness.flushBus();
        await harness.flushBus();

        legacySpy.stop();
        sensorRawSpy.stop();
        actuatorRawSpy.stop();
        fineSpy.stop();

        // Убеждаемся, что broadcasting all-data-raw-get больше не отправляется
        assert.equal(legacySpy.events.length, 0, 'all-data-raw-get не должен отправляться');

        // Убеждаемся, что отправлены адресные события
        assert.equal(sensorRawSpy.events.length, 1);
        assert.equal(actuatorRawSpy.events.length, 1);

        // Оба канала приняли значения и обновили Value
        assert.equal(sensor.Value, 24.5);
        assert.equal(actuator.Value, 80);

        // Оба канала опубликовали all-data-fine-set
        const fineByChannel = Object.fromEntries(fineSpy.events.map(e => [e.arg[0], e.value[0].Value]));
        assert.equal(fineByChannel[sensorName], 24.5);
        assert.equal(fineByChannel[actuatorName], 80);
    } finally {
        harness.cleanup();
    }
});

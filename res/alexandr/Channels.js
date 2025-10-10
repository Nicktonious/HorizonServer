module.exports = [
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc5-Button",   ChMeas: "on/off", SourceName: "Broker01", DeviceId: "but05",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc5-press" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc5-Temp",     ChMeas: "C", 	 SourceName: "Broker01", DeviceId: "sht05",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc5-temperature" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc5-Hum",      ChMeas: "%", 	 SourceName: "Broker01", DeviceId: "sht05",  ChNum: 1, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc5-humidity" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc5-Mag",      ChMeas: "mT", 	 SourceName: "Broker01", DeviceId: "hall05", ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc5-T" },
	
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc6-Button",   ChMeas: "on/off", SourceName: "Broker01", DeviceId: "but06",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc6-press" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc6-Temp",     ChMeas: "C", 	 SourceName: "Broker01", DeviceId: "sht06",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc6-temperature" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc6-Hum",      ChMeas: "%", 	 SourceName: "Broker01", DeviceId: "sht06",  ChNum: 1, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc6-humidity" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc6-Mag",      ChMeas: "mT", 	 SourceName: "Broker01", DeviceId: "hall06", ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc6-T" },
	
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc7-Button",   ChMeas: "on/off", SourceName: "Broker01", DeviceId: "but07",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc7-press" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc7-Temp",     ChMeas: "C", 	 SourceName: "Broker01", DeviceId: "sht07",  ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc7-temperature" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc7-Hum",      ChMeas: "%", 	 SourceName: "Broker01", DeviceId: "sht07",  ChNum: 1, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc7-humidity" },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "plc7-Mag",      ChMeas: "mT", 	 SourceName: "Broker01", DeviceId: "hall07", ChNum: 0, DeviceHash: "e8fb-b1b0-2899-488d", Address: "/Horizon/plc7-T" },

    { ChStatus: "active", ChType: "sensor",  ChAlias: "adam-Temp1",    ChMeas: "C",      SourceName: "ADAM-6217",DeviceId: "adam",   ChNum: 2, DeviceHash: "e8fb-b1b0-2899-488d", Address: "", Config: { transform: {k: 0.015259, b: -550.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "adam-Light",    ChMeas: "Lux", 	 SourceName: "ADAM-6217",DeviceId: "adam",   ChNum: 3, DeviceHash: "e8fb-b1b0-2899-488d", Address: "", Config: { transform: {k: 0.000152, b: -5.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "adam-Temp2",    ChMeas: "C", 	 SourceName: "ADAM-6217",DeviceId: "adam",   ChNum: 4, DeviceHash: "e8fb-b1b0-2899-488d", Address: "", Config: { transform: {k: 0.015259, b: -550.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "adam-V1",       ChMeas: "V", 	 SourceName: "ADAM-6217",DeviceId: "adam",   ChNum: 5, DeviceHash: "e8fb-b1b0-2899-488d", Address: "", Config: { transform: {k: 0.000305, b: -10.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "adam-V2",       ChMeas: "V", 	 SourceName: "ADAM-6217",DeviceId: "adam",   ChNum: 6, DeviceHash: "e8fb-b1b0-2899-488d", Address: "", Config: { transform: {k: 0.000305, b: -10.0} } },

    { ChStatus: "active", ChType: "actuator",ChAlias: "plc4-switch",   ChMeas: "on/off", SourceName: "ADAM-6256",DeviceId: "adam2",  ChNum: 21,DeviceHash: "e8fb-b1b0-2899-488d", Address: "" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc5-switch",   ChMeas: "on/off", SourceName: "ADAM-6256",DeviceId: "adam2",  ChNum: 22,DeviceHash: "e8fb-b1b0-2899-488d", Address: "" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc6-switch",   ChMeas: "on/off", SourceName: "ADAM-6256",DeviceId: "adam2",  ChNum: 23,DeviceHash: "e8fb-b1b0-2899-488d", Address: "" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc7-switch",   ChMeas: "on/off", SourceName: "ADAM-6256",DeviceId: "adam2",  ChNum: 24,DeviceHash: "e8fb-b1b0-2899-488d", Address: "" },

    { ChStatus: "active", ChType: "sensor",  ChAlias: "mqtt-Temp1",    ChMeas: "C",      SourceName: "Broker01", DeviceId: "adam",   ChNum: 2, DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F712B4/data", ValueKey: "ai3", Config: { transform: {k: 100, b: -50.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "mqtt-Light",    ChMeas: "Lux", 	 SourceName: "Broker01", DeviceId: "adam",   ChNum: 3, DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F712B4/data", ValueKey: "ai4", },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "mqtt-Temp2",    ChMeas: "C", 	 SourceName: "Broker01", DeviceId: "adam",   ChNum: 4, DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F712B4/data", ValueKey: "ai5", Config: { transform: {k: 100, b: -50.0} } },
    { ChStatus: "active", ChType: "sensor",  ChAlias: "mqtt-V1",       ChMeas: "V", 	 SourceName: "Broker01", DeviceId: "adam",   ChNum: 5, DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F712B4/data", ValueKey: "ai6",},
    { ChStatus: "active", ChType: "sensor",  ChAlias: "mqtt-V2",       ChMeas: "V", 	 SourceName: "Broker01", DeviceId: "adam",   ChNum: 6, DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F712B4/data", ValueKey: "ai7", },

    { ChStatus: "active", ChType: "actuator",ChAlias: "plc4-mqtt",     ChMeas: "on/off", SourceName: "Broker01", DeviceId: "adam2",  ChNum: 21,DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F701EC/ctl/do5", ValueType: "string" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc5-mqtt",     ChMeas: "on/off", SourceName: "Broker01", DeviceId: "adam2",  ChNum: 22,DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F701EC/ctl/do6", ValueType: "string" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc6-mqtt",     ChMeas: "on/off", SourceName: "Broker01", DeviceId: "adam2",  ChNum: 23,DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F701EC/ctl/do7", ValueType: "string" },
    { ChStatus: "active", ChType: "actuator",ChAlias: "plc7-mqtt",     ChMeas: "on/off", SourceName: "Broker01", DeviceId: "adam2",  ChNum: 24,DeviceHash: "e8fb-b1b0-2899-488d", Address: "Advantech/00D0C9F701EC/ctl/do8", ValueType: "string" }

];
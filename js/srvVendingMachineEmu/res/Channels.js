module.exports = [

    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-lift-motor-up", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-motor", ChNum: 0, DeviceHash: "1", Address: "/VendingMachine/MainBox/lift/motors/0", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-lift-motor-down", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-motor", ChNum: 1, DeviceHash: "1", Address: "/VendingMachine/MainBox/lift/motors/1", ValueType: "number" },

    {
        ChStatus: "active", ChType: "sensor", Name: "vm-mb-lift-motors-current", ChMeas: "A", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-motors-current",
        ChNum: 0, DeviceHash: "0000-0000-0000-0002", Address: "/VendingMachine/MainBox/lift/motors-current/0/", ValueType: "number"
    },

    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-lift-counter", ChMeas: "count", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-control", ChNum: 0, DeviceHash: "0", Address: "/VendingMachine/MainBox/lift/tampers/0", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-lift-tamper-bottom", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-control", ChNum: 1, DeviceHash: "0", Address: "/VendingMachine/MainBox/lift/tampers/1", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-lift-tamper-top", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-control", ChNum: 2, DeviceHash: "0", Address: "/VendingMachine/MainBox/lift/tampers/2", ValueType: "number" },

    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-lift-level-set", ChMeas: "count", SourceName: "VendingMachineSource", DeviceId: "vm-mb-lift-control", ChNum: 0, DeviceHash: "0", ValueType: "number" },


    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-tamper-0", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-0", ChNum: 0, DeviceHash: "0", Address: "/VendingMachine/MainBox/spiral-tampers/0", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-tamper-1", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-1", ChNum: 1, DeviceHash: "0", Address: "/VendingMachine/MainBox/spiral-tampers/1", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-tamper-2", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-2", ChNum: 2, DeviceHash: "0", Address: "/VendingMachine/MainBox/spiral-tampers/2", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-tamper-3", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-3", ChNum: 3, DeviceHash: "0", Address: "/VendingMachine/MainBox/spiral-tampers/3", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-tamper-4", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-4", ChNum: 4, DeviceHash: "0", Address: "/VendingMachine/MainBox/spiral-tampers/4", ValueType: "number" },

    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-motor-0", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-0", ChNum: 0, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors/0", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-motor-1", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-1", ChNum: 1, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors/1", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-motor-2", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-2", ChNum: 2, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors/2", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-motor-3", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-3", ChNum: 3, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors/3", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-motor-4", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-4", ChNum: 4, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors/4", ValueType: "number" },

    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-motors-current-0", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-0", ChNum: 0, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors-current/0", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-motors-current-1", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-1", ChNum: 1, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors-current/1", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-motors-current-2", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-2", ChNum: 2, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors-current/2", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-motors-current-3", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-3", ChNum: 3, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors-current/3", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-motors-current-4", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-motor-4", ChNum: 4, DeviceHash: "1", Address: "/VendingMachine/MainBox/spiral-motors-current/4", ValueType: "number" },

    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-cell-lock-0", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-0", ChNum: 0, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks/0", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-cell-lock-1", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-1", ChNum: 1, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks/1", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-cell-lock-2", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-2", ChNum: 2, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks/2", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-cell-lock-3", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-3", ChNum: 3, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks/3", ValueType: "number" },
    { ChStatus: "active", ChType: "actuator", Name: "vm-mb-cell-lock-4", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-4", ChNum: 4, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks/4", ValueType: "number" },

    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-cell-lock-status-0", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-0", ChNum: 0, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks-status/0", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-cell-lock-status-1", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-1", ChNum: 1, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks-status/1", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-cell-lock-status-2", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-2", ChNum: 2, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks-status/2", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-cell-lock-status-3", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-3", ChNum: 3, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks-status/3", ValueType: "number" },
    { ChStatus: "active", ChType: "sensor", Name: "vm-mb-cell-lock-status-4", ChMeas: "on/off", SourceName: "VendingMachineSource", DeviceId: "vm-mb-cell-4", ChNum: 4, DeviceHash: "1", Address: "/VendingMachine/MainBox/cell-locks-status/4", ValueType: "number" },
];
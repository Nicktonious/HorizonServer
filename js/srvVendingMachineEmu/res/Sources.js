module.exports = [
    { ID: 4, Status: "active", Name: "PLC31", Type: "source", Property: "rw", Protocol: "lhp", DN: "", IP: "192.168.50.161", Port: "8080", SensorChExpected: 64 },
    { ID: 6, Status: "active", Name: "hubc445", Type: "source", Property: "r", Protocol: "rpi", DN: "", IP: "192.168.50.233", Port: "7777", SensorChExpected: 64 },
    // { ID: 7, Status: "active", Name: "Broker01", Type: "source", Property: "w", Protocol: "mqttgw", DN: "", IP: "localhost", Port: "9001", Login: 'operator2', Password: '34pass', SensorChExpected: 64 },
    { ID: 8, Status: "active", Name: "Broker01", Type: "source", Property: "rw", Protocol: "mqtt", DN: "", IP: "localhost", Port: "1883", Login: 'operator2', Password: '34pass', SensorChExpected: 64 },
    { ID: 9, Status: "active", Name: "ADAM-6217", Type: "source", Property: "rw", Protocol: "modbus", DN: "", IP: "10.110.91.2", Port: "502", SensorChExpected: 5, Groups: [{type: 'holdReg', startReg: 2, numRegs: 3, interval: 1000}, {type: 'holdReg', startReg: 5, numRegs: 2, interval: 3000}] },
    { ID: 10,Status: "active", Name: "ADAM-6256", Type: "source", Property: "rw", Protocol: "modbus", DN: "", IP: "10.110.91.1", Port: "502", SensorChExpected: 4, Groups: [{type: 'Coil', startReg: 21, numRegs: 4}] },
    { ID: 11, Status: "active", Name: "VendingMachine", Type: "source", Property: "rw", Protocol: "mqtt", DN: "", IP: "localhost", Port: "1883", Login: 'operator3', Password: 'pwd567', SensorChExpected: 64 },
];
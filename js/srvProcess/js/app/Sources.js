module.exports = [
    { ID: 10, Status: "active", Name: "ANTEX",     Type: "source", Property: "rw", Protocol: "mled",   DN: "", IP: "10.130.1.113", Port: "10001", SensorChExpected: 1,  Groups: [{mbID: 1}] },
    { ID: 11, Status: "active", Name: "NLS-04",    Type: "source", Property: "rw", Protocol: "mbnls",  DN: "", IP: "10.130.1.111", Port: "10002", SensorChExpected: 6,  Groups: [{mbID: 4, beh: 'SensorElectro', interval: 50}, {mbID: 4, beh: 'SensorGeneral', interval: 2000}, {mbID: 4, beh: 'SensorOutput', interval: 300000}] },
    { ID: 12, Status: "active", Name: "KCS-03",    Type: "source", Property: "rw", Protocol: "mbkcs",  DN: "", IP: "10.130.1.111", Port: "10001", SensorChExpected: 32, Groups: [{mbID: 44, beh: 'Sensor', interval: 10000}] },
];
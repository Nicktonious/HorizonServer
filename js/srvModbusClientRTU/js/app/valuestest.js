const Modbus = require('modbus-serial');
const client = new Modbus();


//client.connectRTUBuffered("COM24", { baudRate: 19200, parity: "none", dataBits: 8, stopBits: 1 });
client.connectTelnet('10.110.81.5', { port: 10001 })
client.setID(128);

// read the values of 10 registers starting at address 0
// on device number 1. and log the values to the console.
setInterval(() => {
    client.readHoldingRegisters(0, 1, (err, data) => {
        console.log(data.data);
    });
}, 1000);
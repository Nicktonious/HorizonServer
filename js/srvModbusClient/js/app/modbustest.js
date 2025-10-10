const Modbus = require('jsmodbus')
const net = require('net')
const socket = new net.Socket()
const client = new Modbus.client.TCP(socket, 1)
const options = {
    'host' : '10.110.91.1',
    'port' : 502
}

const TYPE_REGISTER = 0XCA;
const NUM_CHANNELS = 5;
const HOLD_REGISTER = 0x02;
const PRECISION = 4;

const TYPE_CODES = [
    {code: 0x0143, min: -10, max: 10},
    {code: 0x0142, min: -5, max: 5},
    {code: 0x0140, min: -1, max: 1},
    {code: 0x0104, min: -0.5, max: 0.5},
    {code: 0x0103, min: -0.15, max: 0.15},
    {code: 0x0181, min: -0.02, max: 0.02},
    {code: 0x0182, min: -0.02, max: 0.02},
    {code: 0x0180, min: 3.98, max: 4.02}
]

socket.on('connect', () => {

    // make some calls
    console.log('connected');
    let input_range = [];

    client.readCoils(20,8)
        .then(function (resp) {
            resp.response._body._valuesAsArray.forEach((val) => {
                console.log(val);                
            })
            socket.end();
        }).catch(function () {
            console.error(arguments);
            socket.end();
    })

    client.writeSingleCoil(20, false)
        .then(function (resp) {
            console.log(resp);
            socket.end();
        }).catch(function () {
            console.error(arguments);
            socket.end();
    })

   /* client.readHoldingRegisters(TYPE_REGISTER, NUM_CHANNELS).then((resp) => {
        resp.response._body._valuesAsArray.forEach((val) => {
            input_range.push(TYPE_CODES.find(setting => setting.code == val));
        })
    });

    let interval = setInterval(() => {
        client.readHoldingRegisters(17, 9).then((resp) => {
            resp.response._body._valuesAsArray.forEach((val, index) => {
                console.log(val);
                //val = ((val/0xFFFF) * (input_range[index].max - input_range[index].min)) + input_range[index].min;
                //console.log(`${val.toFixed(PRECISION)} V`);
            })
            console.log();
        })
        .catch(() => {
            console.error(require('util').inspect(arguments, {
                depth: null
            }))
            clearInterval(interval);
            socket.end();
        })
    }, 1000);*/
});

socket.on('data', (data) => {
    console.log(data);
})

socket.on('error', console.error);
socket.connect(options);
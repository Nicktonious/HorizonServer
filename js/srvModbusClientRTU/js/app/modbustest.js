const Modbus = require('modbus-serial');
const client = new Modbus();

let flag = false;
let q = [];


client.connectTelnet('10.110.81.5', { port: 10001 })
    .then(setClient)
    .then(function() {
        console.log("Connected");
    })
    .catch(function(e) {
        console.log(e.message);
    });

function setClient() {
    // set the client's unit id
    // set a timeout for requests default is null (no timeout)
    client.setID(170);
    // run program
    run();
}

function run() {
    // read the 4 registers starting at address 5
    let r, g, b, i;

    i = [1];

    console.log(i.length);
    //queue(30, 3, (data) => {console.log(data.data)});
    //queue(48, [8191,0], (data) => {console.log(data)});
    //queue(30, [47], (data) => {console.log(data)});
    /*test(i)
        .then((data) => console.log(data.data.buffer));*/


    /*setInterval (() => {
        /*i = Math.floor((Math.random() * 255) % 10);
        r = Math.floor((Math.random() * 255) % 255);
        g = Math.floor((Math.random() * 255) % 255);
        b = Math.floor((Math.random() * 255) % 255);

        console.log(i,r,g,b);*/

        /*i++;
        i = i % 7;

        client.writeRegister(30, i+21)
            .then(()=> {
                console.log(i)
                /*client.writeRegisters(50, [i, (g << 8) | r, b])
                    .catch(function(e) {
                        console.log(e.message);
                        close();
                })*/
         /*   })
            .catch((e) => {
                    console.log(e.message);
                    close();
                })
        
    }, 1000)*/
    
}

function queue(r, l, _cb) {
    if (flag) {
        q.push([r, l, _cb]);
        return;
    }

    flag = true;
    let cbTOut = setTimeout(() => {
        flag = false;
        _cb();
        if (q > 0) 
            queue.apply(this, q.shift());
    }, 3000);

    client.writeRegisters(r, l)
    .then((data) => {
        clearTimeout(cbTOut);
        _cb(data);
        flag = false;
        if (q.length > 0) 
            queue.apply(this, q.shift());
    })
}

/*function test (i, x ,y) {
    return new Promise((res,rej) => {
        if (i == 1) {
            client.readHoldingRegisters(0, 1)
            .then((data) => {
                res(data);
            })
            .catch((err) => {
                rej(err);
            })
        }
        else {
            client.writeRegister(30, 22)
            .then((data) => {
                res(data);
            })
            .catch((err) => {
                rej(err);
            })
        }        
    })
}*/


function close() {
    client.close();
}
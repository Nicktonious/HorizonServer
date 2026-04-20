const net = require('net');

let client = new net.Socket();

client.on("connect", function() {
    console.log(new Date(), " connect");
});

client.on("close", function(had_error) {
    console.log(new Date(), "close");
});

client.on("error", function(had_error) {
    console.log("error");
});

client.on("timeout", function() {
    console.log("timeout");
});

client.connect(10001, "10.110.81.5");
//ALERT: This software is alpha. Use at your own risk, especially if using mainnet
//Always, Always, Always protect your private key!

//This the connection point between bitcoin and your local application
//implemented with unwriter libraries for reading and writing to bitcoin
//Dependencies: docker image must be running with redis using default ip and port
// e.g. docker run --name bitshovel-redis -d redis

//for now, redis is simplest message bus. later can support more brokers
const redis = require('redis');
//eventsource for listening to bitsocket streams
const EventSource = require('eventsource');
//for writing to bitcoin
const datacash = require('datacash');

//channel names for the local bus
//messages on these channels will be tna format. See https://github.com/21centurymotorcompany/tna
const CHANNEL_READER = "bitcoin_reader";
const CHANNEL_WRITER = 'bitcoin_writer';
//start and stop listening commands to the shovel connector
const CHANNEL_START = 'shovel_start';
const CHANNEL_STOP = 'shovel_stop';

//eventually these items will be configurable
const BITSOCKET_SOURCE = 'https://bitsocket.org/s/';

//TODO: for now only one listener/query is supportd
//later will support named listeners so each can be started and stopped by name
let BITSOCKET_LISTENERS = [];

const wallet = require(`./wallet.json`)
//example wallet.json
// {
//     "wif":"private key",
//     "address": "optional address in legacy format"
// }

//set up connection to local message bus
const localbus_sub = redis.createClient();
const localbus_pub = redis.createClient();
localbus_sub.on("connect", function () {
    console.log("Connected to local bus");
});

localbus_sub.on("subscribe", function (channel, message) {
    if (channel === CHANNEL_WRITER) {
        console.log(`Send message to channel '${CHANNEL_WRITER}' to send a bitcoin message`);
    }
    if (channel === CHANNEL_START) {
        console.log(`Send query to channel '${CHANNEL_START}' to get bitcoin messages`);
    }
    if (channel === CHANNEL_STOP) {
        console.log(`Send anything to channel '${CHANNEL_STOP}' to stop receiving bitcoin messages`);
    }
});

localbus_sub.on("message", function (channel, message) {
    console.log(`got message from local bus ${channel}: ${message}`);
    if (channel === CHANNEL_WRITER) {
        //write the message to bitcoin
        shovelToBitcoin(message);
    }
    if (channel === CHANNEL_START) {
        //start listening to bitsocket messages
        //this will start broadcasting bitcoin tx on to your local bus
        console.log(`starting bitsocket listener ${message}`);
        startBitSocket(message);
    }
    if (channel === CHANNEL_STOP) {
        //stop listening to bitsocket messages
        //this will shut down all bitcoin tx from broadcasting on your local bus
        //you can still send tx (using CHANNEL_WRITE)
        console.log(`stopping bitsocket query ${message}`);
        stopBitSocket(message);
    }
});
localbus_sub.subscribe(CHANNEL_START);
localbus_sub.subscribe(CHANNEL_STOP);
localbus_sub.subscribe(CHANNEL_WRITER);


//start listening for bitcoin messages
//example query...
// {"v": 3, "q": { "find": {} }}
function startBitSocket(query) {
    //console.log(query);
    let b64 = Buffer.from(query).toString('base64')
    //console.log(b64);
    const url = BITSOCKET_SOURCE + b64;
    const bitsocket = new EventSource(url);
    //console.log(url);
    BITSOCKET_LISTENERS.push(bitsocket);
    bitsocket.onmessage = function(e) {
        console.log(e.data);
        shovelToLocalBus(e.data);
    }
    bitsocket.onerror = function(err) {
        console.log(err);
    }
}

function stopBitSocket(name) {
    //TODO: support starting/stopping multiple listeners
    //TODO: for now, just clear out all listeners
    var soxlen = BITSOCKET_LISTENERS.length;
    while (soxlen--) {
        BITSOCKET_LISTENERS[soxlen].close();
        BITSOCKET_LISTENERS.splice(soxlen, 1);
    }
}

//shovel the bitcoin (bitsocket) message on to the local bus
function shovelToLocalBus(msg) {
    //announce to the local bus that a bitcoin tx has been broadcast
    localbus_pub.publish(CHANNEL_READER, msg);
}

//write the message to bitcoin by creating a transaction
function shovelToBitcoin(message) {
    console.log(`shoveling to bitcoin ${message}`);
    datacash.send({
      data: ["0x6d02", message],
      cash: { key: wallet.wif }
    });
    //TODO:should raise event saying that tx was sent
}


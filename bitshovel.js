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
const datapay = require('datapay');
const bsv = require('bsv')
const fs = require('fs');

//channel names for the local bus
//messages on these channels will be tna format. See https://github.com/21centurymotorcompany/tna
const CHANNEL_READER = "bitshovel.reader";
const CHANNEL_WRITER = 'bitshovel.writer';
//start and stop listening commands to the shovel connector
//TODO: there could be one channel for commands, with command type as part of the message
const CHANNEL_START = 'bitshovel.start';
const CHANNEL_STOP = 'bitshovel.stop';
const CHANNEL_WALLET = 'bitshovel.wallet';
//keys stored in redis
const WALLET_ADDRESS_KEY = 'bitshovel.wallet.address';
const WALLET_PRIVATE_KEY = 'bitshovel.wallet.private';

//eventually these items will be configurable
const BITSOCKET_SOURCE = 'https://bitsocket.org/s/';

//TODO: for now only one listener/query is supportd
//later will support named listeners so each can be started and stopped by name
let BITSOCKET_LISTENERS = [];

const walletFileName = `wallet.json`;
if (!fs.existsSync(walletFileName)) {
    generateWallet();
}
let wallet = require(`./${walletFileName}`);

//set up connection to local message bus
const localbus_sub = redis.createClient();
const localbus_pub = redis.createClient();
storeWalletAddress(wallet.address);
localbus_sub.on("connect", function () {
    console.log("Connected to local bus");
});

localbus_sub.on("subscribe", function (channel, message) {
    if (channel === CHANNEL_WRITER) {
        console.log(`Send message to channel '${CHANNEL_WRITER}' to send a bitcoin message`);
    }
    if (channel === CHANNEL_WRITER) {
        console.log(`Send message to channel '${CHANNEL_WALLET}' to change wallet`);
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
    if (channel === CHANNEL_WALLET) {
        //store the private key in local wallet
        //TODO:should encrypt private key on the wire
        if (wallet.wif != message) {
            wallet = generateWallet(message);
            storeWalletAddress(wallet.address);
        }
    }
});
localbus_sub.subscribe(CHANNEL_START);
localbus_sub.subscribe(CHANNEL_STOP);
localbus_sub.subscribe(CHANNEL_WRITER);
localbus_sub.subscribe(CHANNEL_WALLET);

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

//shovel the bitcoin (bitsocket tna) message on to the local bus
function shovelToLocalBus(msg) {
    //announce to the local bus that a bitcoin tx has been broadcast
    localbus_pub.publish(CHANNEL_READER, msg);
}

//write the message to bitcoin by creating a transaction
function shovelToBitcoin(message) {
    console.log(`shoveling to bitcoin ${message}`);
    datapay.send({
      data: ["0x6d02", message],
      pay: { key: wallet.wif }
    }, function sendResult(err,txid) {
        if (err) {
            console.log(err);
        }
        if (txid) {
            console.log(`txid:${txid}`);
        }
    });
    //TODO:should raise event saying that tx was sent
}

//example wallet.json
// {
//     "wif":"private key",
//     "address": "optional address in legacy format"
// }
function generateWallet(key) {
    let pk = null; 
    if (key !== null && key !== undefined && key !== '') {
        pk = bsv.PrivateKey(key)
    } else {
        pk = bsv.PrivateKey()
    }
    const address = new bsv.Address(pk.publicKey, bsv.Networks.mainnet)
    console.log(`generated wallet with address ${address}`);

    const wallet = {
        "wif": pk.toWIF(),
        "address": address.toLegacyAddress()
    }
    return storeWallet(wallet)
}

function storeWallet(wallet) {
    const sWallet = JSON.stringify(wallet, null, 2);
    backupWallet()
    fs.writeFileSync(walletFileName, sWallet, 'utf8', function(err) {
        if(err) {
            return console.log(err);
        }
    });
    return wallet;
}

function backupWallet() {
    if (fs.existsSync(walletFileName)) {
        let timestamp = (new Date()).toISOString()
        .replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$/, '$1$2$3.$4$5$6.$7000000');
        fs.renameSync(walletFileName, `${walletFileName}.${timestamp}`)
    }
}

//store wallet address in redis
function storeWalletAddress(address) {

    localbus_pub.set(WALLET_ADDRESS_KEY, address, redis.print);
}
//ALERT: This software is alpha. Use at your own risk, especially if using mainnet
//Always, Always, Always protect your private key!

//This the connection point between bitcoin and your local application
//implemented with unwriter libraries for reading and writing to bitcoin

const utils = require('./utils')
//for now, redis is simplest message bus. later can support more brokers
const redis = require('redis');
//eventsource for listening to bitsocket streams
const EventSource = require('eventsource');
//for writing to bitcoin
const datapay = require('datapay');
const bsv = require('bsv')
const fs = require('fs');
const axios = require('axios')

const DEBUG = false

//channel names for the local bus
//messages on these channels will be tna format. See https://github.com/21centurymotorcompany/tna
const CHANNEL_READ = "bitshovel.watch";
const CHANNEL_SEND = 'bitshovel.send';
//TODO: there could be one channel for commands, with command type as part of the message
//manage wallet
const CHANNEL_WALLET = 'bitshovel.wallet';
//const CHANNEL_ADDRESS = 'bitshovel.address';
//stream for bitsocket streams
const CHANNEL_STREAM = 'bitshovel.stream';
//query for bitdb queries
const CHANNEL_QUERY = 'bitshovel.query';
//bitshovel application command
const CHANNEL_APP = 'bitshovel.app';
//keys stored in redis
const WALLET_ADDRESS_KEY = 'bitshovel.wallet.address';
const WALLET_PRIVATE_KEY = 'bitshovel.wallet.private';

//eventually these items will be configurable
const BITSOCKET_SOURCE = 'https://bitgraph.network/s/'
const BITDB_SOURCE = 'https://bitdb.network/q/'
const BITDB_API_KEY = 'qrr6u2amzamlf7cay750j0fnd76fhhcpxgr2ekv2wg'

//list of active listeners
let BITSOCKET_LISTENERS = [];

//create a wallet if there is none
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
    if (channel === CHANNEL_WALLET) {
        console.log(`Use message '${CHANNEL_WALLET}' to change wallet`);
    }
    if (channel === CHANNEL_STREAM) {
        console.log(`Use message '${CHANNEL_STREAM}' to stream live bitcoin messages`);
    }
    if (channel === CHANNEL_QUERY) {
        console.log(`Use message '${CHANNEL_QUERY}' to get historical bitcoin messages`);
    }
    if (channel === CHANNEL_APP) {
        console.log(`Use message '${CHANNEL_APP}' to control app functions`);
    }
    if (channel === CHANNEL_SEND) {
        console.log(`Use message '${CHANNEL_SEND}' to write to bitcoin (send bitcoin message)`);
    }
});

localbus_sub.on("message", function (channel, message) {
    try {
        console.log(`got message from local bus ${channel}: ${message}`);
        if (channel === CHANNEL_SEND) {
            //send the message to bitcoin
            shovelToBitcoin(message);
        }
        //example: bitshovel.stream start|stop name query
        if (channel === CHANNEL_STREAM) {
            const cmd = utils.parseCommand("stream", message)
            if (utils.isStart(cmd.action)) {
                //start listening to bitsocket messages
                //this will start broadcasting bitcoin tx on to your local bus
                console.log(`starting bitsocket listener ${message}`);
                startBitSocket(cmd);
            }
            if (utils.isStop(cmd.action)) {
                //stop listening to bitsocket messages
                //this will shut down all bitcoin tx from broadcasting on your local bus
                //you can still send tx (using CHANNEL_SEND)
                stopBitSocket(cmd);
            }
        }
        if (channel === CHANNEL_APP) {
            //application (address) level command. Assumes an address is specified
            //bitsocket used cashaddr. will be converted to use legacy address soon
            const cmd = utils.parseCommand("app", message)
            if (utils.isStart(cmd.action)) {
                console.log(`starting app listener ${message}`);
                startBitSocket(cmd);
            }
            if (utils.isStop(cmd.action)) {
                stopBitSocket(cmd);
            }
        }
        if (channel === CHANNEL_QUERY) {
            const url = utils.urlString(BITDB_SOURCE, makeBitquery(JSON.parse(message)))
            getBitdb(url)
        }
        if (channel === CHANNEL_WALLET) {
            //store the private key in local wallet
            //TODO:should encrypt private key on the wire
            if (wallet.wif != message) {
                wallet = generateWallet(message);
                storeWalletAddress(wallet.address);
            }
        }
    }
    catch (err) {
        console.error(err)
    }
});
localbus_sub.subscribe(CHANNEL_STREAM);
localbus_sub.subscribe(CHANNEL_QUERY);
localbus_sub.subscribe(CHANNEL_SEND);
localbus_sub.subscribe(CHANNEL_APP);
localbus_sub.subscribe(CHANNEL_WALLET);

function getBitdb(url) {
    var header = {
        headers: { key: BITDB_API_KEY }
    };
    axios.get(url, header).then(function(r) {
        //console.log(`queried ${r.data.u.length} results`)
        for (let item of r.data.u) {
            //console.log(JSON.stringify(item))
            shovelToLocalBus(JSON.stringify(item))
        }
    })
}

//start listening for bitcoin messages
//example query...
// {"v": 3, "q": { "find": {} }}
function startBitSocket(cmd) {
    let query = queryFromCommand(cmd)
    const listener = {
        name : cmd.name,
        bitsocket : createEventSource(query)
    }
    BITSOCKET_LISTENERS.push(listener);
    listener.bitsocket.onmessage = function(e) {
        //surprising that this works! function keeps the listener name in context when it fires
        console.log(listener.name);
        logTna(e);
        shovelToLocalBus(e.data);
    }
    listener.bitsocket.onerror = function(err) {
        console.log(err);
    }
}

function queryFromCommand(cmd) {
    if (cmd.command === "stream") {
        //parameter is the query
        return makeBitquery(JSON.parse(cmd.parameter))
    }
    if (cmd.command === "app") {
        //parameter is the address to monitor
        const qry = {
            "v": 3,
            "q": {
              "find": {
                "out.e.a": toCashAddress(cmd.parameter)
              }
            }
          }
          console.log(typeof qry)
        return makeBitquery(qry)
    }
    //what to do?
    return cmd.parameter
}

//make a standard bitquery query
//basically it will add any missing attributes to make it a standard query
function makeBitquery(query) {
    let fullquery = query
    if (!query.hasOwnProperty("q")) {
        // console.log("fixing query")
        //assume that query is just the q attribute, fill in the rest
        fullquery = {
            "v": 3,
            "q": query
        }
    }
    return JSON.stringify(fullquery)
}

function logTna(tna) {
    console.log(tna);
}

function createEventSource(query) {
    const url = utils.urlString(BITSOCKET_SOURCE, query)
    return new EventSource(url)
}

function stopBitSocket(cmd) {
    let soxlen = BITSOCKET_LISTENERS.length;
    while (soxlen--) {
        const listener = BITSOCKET_LISTENERS[soxlen];
        if (listener.name === cmd.name) {
            console.log(`stopping bitsocket listener ${listener.name}`)
            listener.bitsocket.close();
            BITSOCKET_LISTENERS.splice(soxlen, 1);
        }
    }
}

//shovel the bitcoin (bitsocket tna) message on to the local bus
function shovelToLocalBus(msg) {
    //announce to the local bus that a bitcoin tx has been broadcast
    localbus_pub.publish(CHANNEL_READ, msg);
}

//write the message to bitcoin by creating a transaction
function shovelToBitcoin(message) {
    //TODO: for now assume ascii text, later need to distinguish from hex string
    //console.log(`shoveling to bitcoin >${message}<`);
    let split = utils.splitString(message)
    console.log(split)

    if (!DEBUG) {
      datapay.send({
        data: split,
        pay: { key: wallet.wif }
      }, function sendResult(err,txid) {
        if (err) {
            console.log(err);
        }
        if (txid) {
            console.log(`txid:${txid}`);
        }
      });
    }
    //TODO:could raise event saying that tx was sent
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

function toCashAddress(originalAddress) {
    const a = new bsv.Address(originalAddress)
    const ac = a.toCashAddress()
    return ac.replace("bitcoincash:","")
}
function toOriginalAddress(cashAddress) {
    return (new bsv.Address(cashAddress)).toLegacyAddress()
}

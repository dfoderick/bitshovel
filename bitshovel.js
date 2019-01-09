//ALERT: This software is alpha. Use at your own risk, especially if using mainnet
//Always, Always, Always protect your private key!

//This the connection point between bitcoin and your local application
//implemented with unwriter libraries for reading and writing to bitcoin

const utils = require('./utils')
const shovelwallet = require('./shovelwallet')
const shoveladdress = require('./shoveladdress')
const shovelcache = require('./shovelcache')
//application registry
const shovelregistry = require('./shovelregistry')
//bitsocket listeners
const shovellisteners = require('./shovellisteners')
const localbus = require('./shovelbus')
//for writing to bitcoin
const datapay = require('datapay');
const fs = require('fs');
const axios = require('axios')

const DEBUG = false

//eventually these items will be configurable
const BITDB_SOURCE = 'https://bitdb.network/q/'
const BITDB_API_KEY = 'qrr6u2amzamlf7cay750j0fnd76fhhcpxgr2ekv2wg'

//create a wallet if there is none
if (!fs.existsSync(shovelwallet.walletFileName)) {
    shovelwallet.generateWallet();
}
let wallet = require(`./${shovelwallet.walletFileName}`);

function main () {
    localbus.start()
    shovelcache.start()
    shovelcache.storeWalletAddress(wallet.address);

    localbus.sub.on("message", function (channel, message) {
        try {
            console.log(`got message from local bus ${channel}: ${message}`);
            if (channel === localbus.CHANNEL_SEND) {
                //send the message to bitcoin
                shovelToBitcoin(message);
            }
            //example: bitshovel.stream start|stop name query
            if (channel === localbus.CHANNEL_STREAM) {
                const cmd = utils.parseCommand("stream", message)
                if (utils.isStart(cmd.action)) {
                    //start listening to bitsocket messages
                    //this will start broadcasting bitcoin tx on to your local bus
                    console.log(`starting bitsocket listener ${message}`);
                    startBitSocket(cmd);
                }
                if (utils.isStop(cmd.action)) {
                    shovellisteners.close(cmd.name)
                }
            }
            if (channel === localbus.CHANNEL_APP) {
                //application (address) level command. Assumes an address is specified
                //bitsocket used cashaddr. will be converted to use legacy address soon
                const cmd = utils.parseCommand("app", message)
                console.log(cmd)
                if (utils.isStart(cmd.action)) {
                    console.log(`starting app listener ${message}`);
                    startBitSocket(cmd);
                } else if (utils.isStop(cmd.action)) {
                    stopBitSocket(cmd);
                } else if (cmd.action === 'register') {
                    registerApplication(cmd)
                } else {
                    console.log(`unknown command ${cmd}`)
                }
            }
            if (channel === localbus.CHANNEL_QUERY) {
                const url = utils.urlString(BITDB_SOURCE, makeBitquery(JSON.parse(message)))
                getBitdb(url)
            }
            if (channel === localbus.CHANNEL_WALLET) {
                //store the private key in local wallet
                //TODO:should encrypt private key on the wire
                if (wallet.wif != message) {
                    wallet = shovelwallet.generateWallet(message);
                    shovelcache.storeWalletAddress(wallet.address);
                }
            }
        }
        catch (err) {
            console.error(err)
        }
    })
    localbus.subscribeall()
}

main()

function registerApplication(cmd) {
    //for now use the bitshovel wallet, in future probably want each app to have wallet
    localbus.pub.set(cmd.name, wallet.address, function(err) {
        if (err) {
            console.error(err)
        }
    })
    //localbus_pub.hmset(CHANNEL_APP, cmd.name, wallet.address)
    //register the app in the app registry
    shovelregistry.register(cmd.name, wallet.address)
}

function getBitdb(url) {
    var header = {
        headers: { key: BITDB_API_KEY }
    }
    axios.get(url, header).then(function(r) {
        //console.log(`queried ${r.data.u.length} results`)
        //unconfirmed tx
        for (let item of r.data.u) {
            localbus.publish(JSON.stringify(item))
        }
        //confirmed tx
        for (let item of r.data.c) {
            localbus.publish(JSON.stringify(item))
        }
    })
}

//start listening for bitcoin messages
//example query...
// {"v": 3, "q": { "find": {} }}
function startBitSocket(cmd) {
    //let address = findAddressforApplication(cmd)
    let query = queryFromCommand(cmd)
    const listener = shovellisteners.listen(cmd.name, query)
    listener.bitsocket.onmessage = function(e) {
        //surprising that this works! function keeps the listener name in context when it fires
        console.log(listener.name);
        logTna(e);
        localbus.publish(e.data);
    }
    listener.bitsocket.onerror = function(err) {
        console.log(err);
    }
}

function logit(category, s) {
    console.log(`${category} ${s}`)
}

function logTna(tna) {
    console.log(tna);
}

function queryFromCommand(cmd) {
    if (cmd.command === "stream") {
        //parameter is the query
        return makeBitquery(JSON.parse(cmd.parameter))
    }
    if (cmd.command === "app") {
        //parameter is the address to monitor
        address = findAddressforApplication(cmd)
        console.log(address)
        const qry = {
            "v": 3,
            "q": {
              "find": {
                "out.e.a": shoveladdress.toCashAddress(address)
              }
            }
          }
        return makeBitquery(qry)
    }
    //what to do?
    return cmd.parameter
}

//translate application alias to address
function findAddressforApplication(cmd) {
    // (async () => {
        //if param was passed then use that as address
        if (cmd.parameter) {
            return cmd.parameter
        }
        //otherwise look up the app by name
        // await localbus_pub.hget(CHANNEL_APP, cmd.name, function (err, obj) {
        //     if (obj) {
        //         return obj
        //     }
        //     return cmd.name
        // })
        if (shovelregistry.has(cmd.name)) {
            return shovelregistry.get(cmd.name)
        }
        return cmd.name
    // })()
}

//make a standard bitquery query
//basically it will add any missing attributes to make it a standard query
function makeBitquery(query) {
    let fullquery = query
    if (!query.hasOwnProperty("q")) {
        //assume that query is just the q attribute, fill in the rest
        fullquery = {
            "v": 3,
            "q": query
        }
    }
    return JSON.stringify(fullquery)
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


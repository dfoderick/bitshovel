//for now, redis is simplest message bus. later can support more brokers
const utils = require('./utils')
const redis = require('redis');

//local apps will watch/listen/subscribe to this channel
const CHANNEL_READ = "bitshovel.watch";
//channel names for the local bus
//messages on these channels will be tna format. See https://github.com/21centurymotorcompany/tna
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

let subscribe = function subscribe(channel) {
    sub.subscribe(channel);
}

//shovel the bitcoin (bitsocket tna) message on to the local bus
function publish(msg) {
    //announce to the local bus that a bitcoin tx has been broadcast
    pub.publish(CHANNEL_READ, msg);
}

//set up connection to local message bus
const sub = redis.createClient();
const pub = redis.createClient();

sub.on("connect", function () {
    console.log("Connected to local bus");
});

sub.on("subscribe", function (channel, message) {
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

subscribe(CHANNEL_STREAM);
subscribe(CHANNEL_QUERY);
subscribe(CHANNEL_SEND);
subscribe(CHANNEL_APP);
subscribe(CHANNEL_WALLET);

module.exports = {
    sub: sub,
    subscribe: subscribe,
    pub: pub,
    publish: publish,
    CHANNEL_WALLET: CHANNEL_WALLET,
    CHANNEL_STREAM: CHANNEL_STREAM,
    CHANNEL_QUERY: CHANNEL_QUERY,
    CHANNEL_APP: CHANNEL_APP,
    CHANNEL_SEND: CHANNEL_SEND
}

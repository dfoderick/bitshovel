//eventsource for listening to bitsocket streams
const utils = require('./utils')
const EventSource = require('eventsource');
const BITSOCKET_SOURCE = 'https://bitgraph.network/s/'

//maintains list of active bitsocket listeners
let BITSOCKET_LISTENERS = [];

let listen = function listen (name, query) {
    const listener = {
        name : name,
        bitsocket : createEventSource(query)
    }
    BITSOCKET_LISTENERS.push(listener);
    return listener
}

function createEventSource(query) {
    console.log(query)
    const url = utils.urlString(BITSOCKET_SOURCE, query)
    return new EventSource(url)
}

//stop listening to bitsocket messages
//this will shut down all bitcoin tx from broadcasting on your local bus
//you can still send tx (using CHANNEL_SEND)
let close = function close(name) {
    let soxlen = BITSOCKET_LISTENERS.length;
    while (soxlen--) {
        const listener = BITSOCKET_LISTENERS[soxlen];
        if (listener.name === name) {
            console.log(`stopping bitsocket listener ${listener.name}`)
            listener.bitsocket.close();
            BITSOCKET_LISTENERS.splice(soxlen, 1);
        }
    }
}

module.exports = {
  listen: listen,
  close: close
}
//application registry
//hdwallet
const utils = require('./utils')

//TODO: could be handled by redis instead
let APPS = {}

let register = function register (appname, walletaddress) {
    APPS[appname] = walletaddress
    console.log(`registered ${appname} on ${walletaddress}`)
}

let has = function has(appname) {
    return APPS.hasOwnProperty(appname)
}

let get = function get(appname) {
    return APPS[appname]
}

module.exports = {
    APPS: APPS,
    register: register,
    has: has,
    get: get
}
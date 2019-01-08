const utils = require('./utils')
const bsv = require('bsv')

let toCashAddress = function toCashAddress(originalAddress) {
    const a = new bsv.Address(originalAddress)
    const ac = a.toCashAddress()
    return ac.replace("bitcoincash:","")
}

let toOriginalAddress = function toOriginalAddress(cashAddress) {
    return (new bsv.Address(cashAddress)).toLegacyAddress()
}

module.exports = {
    toCashAddress: toCashAddress,
    toOriginalAddress: toOriginalAddress
}
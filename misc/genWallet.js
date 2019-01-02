// generate a wallet.json file
// remember to fund the wallet using the address generated
// the easiest way to do that is go to https://www.moneybutton.com/test
// and use withdraw button
// then review the tx on a block explorer e.g. https://bchsvexplorer.com

const bsv = require('bsv')
const fs = require('fs');

var pk = bsv.PrivateKey()
console.log(pk)
var address = new bsv.Address(pk.publicKey, bsv.Networks.mainnet)
console.log(address.toLegacyAddress())

wallet = {
    "wif": pk.toWIF(),
    "address": address.toLegacyAddress()
}

const sWallet = JSON.stringify(wallet, null, 2);
console.log(sWallet)

fs.writeFile('wallet.json', sWallet, 'utf8', function(err) {
    if(err) {
        return console.log(err);
    }
});

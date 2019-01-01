// generate a wallet.json file
// remember to fund the wallet using the address generated
// the easiest way to do that is go to https://www.moneybutton.com/test
// and use withdraw button
// then review the tx on a block explorer e.g. https://bchsvexplorer.com

bsv = require('bsv')

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

const fs = require('fs');
fs.writeFile('wallet.json', sWallet, 'utf8', function(err) {
    if(err) {
        return console.log(err);
    }
});

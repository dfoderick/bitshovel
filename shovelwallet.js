const utils = require('./utils')
const bsv = require('bsv')

//example wallet.json
// {
//     "wif":"private key",
//     "address": "optional address in legacy format"
// }
let generateWallet = function generateWallet(key) {
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

let storeWallet = function storeWallet(wallet) {
    const sWallet = JSON.stringify(wallet, null, 2);
    backupWallet()
    fs.writeFileSync(walletFileName, sWallet, 'utf8', function(err) {
        if(err) {
            return console.log(err);
        }
    });
    return wallet;
}

let backupWallet = function backupWallet() {
    if (fs.existsSync(walletFileName)) {
        let timestamp = (new Date()).toISOString()
        .replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$/, '$1$2$3.$4$5$6.$7000000');
        fs.renameSync(walletFileName, `${walletFileName}.${timestamp}`)
    }
}

module.exports = {
    generateWallet: generateWallet,
    storeWallet:storeWallet ,
    backupWallet: backupWallet
}

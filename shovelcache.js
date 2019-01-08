const utils = require('./utils')
const redis = require('redis');

//keys stored in redis
const WALLET_ADDRESS_KEY = 'bitshovel.wallet.address';
const WALLET_PRIVATE_KEY = 'bitshovel.wallet.private';

const cache = redis.createClient();

//store wallet address in redis
let storeWalletAddress = function storeWalletAddress(address) {
    cache.set(WALLET_ADDRESS_KEY, address, redis.print);
}

module.exports = {
    print: cache.print,
    storeWalletAddress: storeWalletAddress
}
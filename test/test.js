const assert = require('assert');
const utils = require('../utils');
const shoveladdress = require('../shoveladdress');
const shovelcache = require('../shovelcache');
const shovelregistry = require('../shovelregistry');
const shovelwallet = require('../shovelwallet');
const shovelbus = require('../shovelbus');

describe('bitshovel', function() {
  describe('utils',function() {
    //command, action, name, parameter
    it('command stream', function(done) {
      let cmd = utils.parseCommand("stream","start streamname query")
      assert.equal(cmd.command, "stream")
      done()
    })
    it('command filter', function(done) {
      let cmd = utils.parseCommand("test","start stream {\"find\":{}}")
      assert.equal(cmd.action, "start")
      assert.equal(cmd.name, "stream")
      assert.equal(cmd.parameter, "{\"find\":{}}")
      done()
    })
    it('command with spaces', function(done) {
      let cmd = utils.parseCommand("test",'start stream "{this is one param}"')
      assert.equal(cmd.action, "start")
      assert.equal(cmd.name, "stream")
      assert.equal(cmd.parameter, "{this is one param}")
      done()
    })
    it('isStart', function(done) {
      assert(utils.isStart('start'))
      assert(utils.isStart("START"))
      assert(utils.isStart('on'))
      assert(utils.isStart('stop') === false)
      done()
    })
    it('isStop', function(done) {
      assert(utils.isStop('stop'))
      assert(utils.isStop("STOP"))
      assert(utils.isStop('off'))
      assert(utils.isStop('') === false)
      done()
    })
    it('parse op_return with hex', function(done) {
      let pushdata = "\"BitShovel Test\""
      let words = utils.splitString(`x0602 "${pushdata}"`)
      console.log(words)
      clean = utils.cleanQuotes(pushdata)
      console.log(clean)
      assert(words.length === 2)
      assert.equal(words[1], clean)
      done()
    })
  //  it('parse with internal quotes', function(done) {
  //    let words = utils.splitString(`first "second \"data\""`)
  //    console.log(words)
  //    //assert(words.length === 2)
  //    assert.equal(words[1], "second \"data\"")
  //    done()
  //  })
  })
  
  describe('address tests',function() {
    it('toCashAddress', function (done) {
      let cash = shoveladdress.toCashAddress('1N9zmDbiE2w7QT8oW524eD3BXdcQ8PpFgM')
      assert.equal(cash, 'qr5qut7whhqvh3ae8hl0y3tgveaa4s834uckgu0t49')
      done()
    })
    it('toOriginalAddress', function (done) {
      let bitcoinaddress = shoveladdress.toOriginalAddress('qr5qut7whhqvh3ae8hl0y3tgveaa4s834uckgu0t49')
      assert.equal(bitcoinaddress, '1N9zmDbiE2w7QT8oW524eD3BXdcQ8PpFgM')
      done()
    })
  })

  describe('registry tests',function() {
    it('register', function (done) {
      let startcount = Object.keys(shovelregistry.APPS).length
      shovelregistry.register("testapp","anyaddress")
      assert.equal(Object.keys(shovelregistry.APPS).length, startcount + 1)
      done()
    })
    it('has', function (done) {
      shovelregistry.register("testapp","anyaddress")
      assert.ok(shovelregistry.has("testapp"))
      done()
    })
    it('get', function (done) {
      shovelregistry.register("testapp","anyaddress")
      assert.equal(shovelregistry.get("testapp"), 'anyaddress')
      done()
    })
  })

    describe('wallet tests',function() {
      it('generate wallet', function (done) {
        let wallet = shovelwallet.generateWallet()
        assert.equal(Object.keys(wallet).length, 2)
        assert(wallet.wif)
        assert(wallet.address)
        done()
      })
    })

  })

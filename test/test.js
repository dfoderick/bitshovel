const assert = require('assert');
const utils = require('../utils');

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
//    it('parse with internal quotes', function(done) {
//      let words = utils.splitString(`first "second \"data\""`)
//      //assert(words.length === 2)
//      assert.equal(words[1], "second \"data\"")
//      done()
//    })
  })
})

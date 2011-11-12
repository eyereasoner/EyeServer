var vows = require('vows'),
    should = require('should');
var eyeserver = require('../eyeserver.js');

vows.describe('EyeServer').addBatch({
  'The eyeserver module': {
    topic: function() { return eyeserver; },
    
    'should be a function': function (eyeserver) {
      eyeserver.should.be.a('function');
    },
    
    'should make EyeServer objects': function (eyeserver) {
      eyeserver().constructor.should.eql(eyeserver);
    },
    
    'should be an EyeServer constructor': function (eyeserver) {
      new eyeserver().constructor.should.eql(eyeserver);
    }
  }
}).export(module);

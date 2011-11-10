var vows = require('vows'),
    should = require('should'),
    SpawnAsserter = require('./spawn-asserter');
var eye = require('../eye.js');
var spawner = new SpawnAsserter();

function proxyMethod(object, methodName) {
  return function() { return object[methodName].apply(object, arguments); };
}

function parentTopicMethod(methodName) {
  return function(topic) { return proxyMethod(topic, methodName); };
}

function failingCallback(callbackName) {
  return function() { should.fail('the ' + callbackName + ' callback should not have been invoked') };
}

vows.describe('Eye').addBatch({
  'The eye module': {
    topic: function() { return eye; },
    
    'should be a function': function (eye) {
      eye.should.be.a('function');
    },
    
    'should make Eye objects': function (eye) {
      eye().constructor.should.eql(eye);
      eye().should.be.an.instanceof(eye);
    },
    
    'should be an Eye constructor': function (eye) {
      new eye().constructor.should.eql(eye);
      new eye().should.be.an.instanceof(eye);
    },
    
    'should have a pass function': function (eye) {
      eye.pass.should.be.a('function');
    },
    
    'should have an execute function': function (eye) {
      eye.execute.should.be.a('function');
    }
  },
  'In an empty Eye instance': {
    topic: new eye({ spawn: spawner.spawn }),
    
    'the execute method': {
      topic: parentTopicMethod('execute'),
    
      "should execute eye with 'nope' by default": function (execute) {
          should.strictEqual(execute(), undefined);
          spawner.command.should.eql('eye');
          spawner.args.should.eql(['--nope']);
      },
      
      "should allow turning off 'nope'": function (execute) {
          should.strictEqual(execute({ nope: false }), undefined);
          spawner.command.should.eql('eye');
          spawner.args.should.eql([]);
      },
      
      "should have an optional 'options' argument": function (execute) {
          should.strictEqual(execute(function() {}), undefined);
          spawner.command.should.eql('eye');
          spawner.args.should.eql(['--nope']);
      },
      
      'should add data a single data URI': function (execute) {
        should.strictEqual(execute({ data: 'http://example.org/1' }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://example.org/1']);
      },
      
      'should add data multiple data URIs': function (execute) {
        should.strictEqual(execute({ data: ['http://ex.org/1', 'https://ex.org/2'] }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://ex.org/1', 'https://ex.org/2']);
      },
      
      'should not add localhost URIs': function (execute) {
        should.strictEqual(execute({ data: ['http://ex.org/1', 'http://localhost/2', 'https://localhost/3'] }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://ex.org/1']);
      },
      
      'should not add 127.0.0.1 URIs': function (execute) {
        should.strictEqual(execute({ data: ['http://ex.org/1', 'http://127.0.0.1/2', 'https://127.0.0.1/2'] }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://ex.org/1']);
      },
      
      'should not add ::1 URIs': function (execute) {
        should.strictEqual(execute({ data: ['http://ex.org/1', 'http://::1/2', 'https://::1/2'] }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://ex.org/1']);
      },
      
      'should not add file URIs': function (execute) {
        should.strictEqual(execute({ data: ['http://ex.org/1', 'file://whatever/', 'file:///whatever/'] }), undefined);
        spawner.command.should.eql('eye');
        spawner.args.should.eql(['--nope', 'http://ex.org/1']);
      },
      
      'should not error on missing stdout function': function (execute) {
        should.strictEqual(execute(), undefined);
        spawner.emit('exit');
      },
      
      'should not error on missing stderr function': function (execute) {
        should.strictEqual(execute(), undefined);
        spawner.stderr.emit('data', '** ERROR ** Message');
        spawner.emit('exit');
      },
      
      'should return empty string on exit when stdout and stderr are empty': function(execute) {
        var result;
        should.strictEqual(execute(function(out) { result = out; }, failingCallback('error')), undefined);
        spawner.emit('exit');
        result.should.eql('');
      },
      
      'should return the output data on exit': function(execute) {
        var result;
        should.strictEqual(execute(function(out) { result = out; }, failingCallback('error')), undefined);
        spawner.stdout.emit('data', 're');
        spawner.stdout.emit('data', 'sult');
        spawner.emit('exit');
        result.should.eql('result');
      },
      
      'should return the error data on exit with errors': function(execute) {
        var result;
        should.strictEqual(execute(failingCallback('output'), function(err) { result = err }), undefined);
        spawner.stderr.emit('data', '** ERROR ** Message');
        spawner.emit('exit');
        result.should.eql('Message');
      }
    }
  }
}).export(module);

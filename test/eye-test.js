var vows = require('vows'),
    should = require('should'),
    fs = require('fs'),
    SpawnAsserter = require('./spawn-asserter');
var eye = require('../eye.js');

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
  'An Eye instance': {
    'when executed without arguments':
      shouldExecuteEyeWith(null,
                           "with 'nope' and 'pass'",
                           ['--nope', '--pass']),
    
    'when executed with nope to false':
      shouldExecuteEyeWith({ nope: false },
                           "without 'nope'",
                           ['--pass']),
    
    'when executed with nope to false':
      shouldExecuteEyeWith({ pass: false },
                           "without 'pass'",
                           ['--nope']),
    
    'when executed with one data URI':
      shouldExecuteEyeWith({ data: 'http://ex.org/1' },
                           "with one data URI",
                           ['--nope', '--pass', 'http://ex.org/1']),
    
    'when executed with multiple data URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://ex.org/2'] },
                           "with multiple data URIs",
                           ['--nope', '--pass', 'http://ex.org/1', 'http://ex.org/2']),
    
    'when executed with localhost URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://localhost/2', 'https://localhost/3'] },
                           "without the localhost URIs",
                           ['--nope', '--pass', 'http://ex.org/1']),
    
    'when executed with 127.0.0.1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://127.0.0.1/2', 'https://127.0.0.1/3'] },
                           "without the 127.0.0.1 URIs",
                           ['--nope', '--pass', 'http://ex.org/1']),
    
    'when executed with ::1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://::1/2', 'https://::1/3'] },
                           "without the ::1 URIs",
                           ['--nope', '--pass', 'http://ex.org/1']),
    
    'when executed with file URIs':
       shouldExecuteEyeWith({ data: ['http://ex.org/1', 'file://example/'] },
                            "without the file URIs",
                            ['--nope', '--pass', 'http://ex.org/1']),
    
    'when executed with an inexisting URI':
      shouldExecuteEyeWith({ data: ['http://ex.org/doesnotexist'] },
                           "with the URI",
                           ['--nope', '--pass', 'http://ex.org/doesnotexist'],
                           null, null,
                           "** ERROR ** Message",
                           "Message"),
    
    'when executed with a query URI':
      shouldExecuteEyeWith({ query: 'http://ex.org/1' },
                           "with the query URI and without 'pass'",
                           ['--nope', '--query', 'http://ex.org/1' ]),
    
    'when executed with multiple query URIs':
      shouldExecuteEyeWith({ query: ['http://ex.org/1', 'http://ex.org/2'] },
                           "with the first query URI and without 'pass'",
                           ['--nope', '--query', 'http://ex.org/1' ]),
    
    'when executed with literal data':
      shouldExecuteEyeWith({ data: '<http://ex/#a> <http://ex/#a> <http://ex/#c>.' },
                           'with a temporary file',
                           shouldEqualPassWithFileData('<http://ex/#a> <http://ex/#a> <http://ex/#c>.')),

    'when executed with literal data with local entities':
      shouldExecuteEyeWith({ data: ':a :b :c.' },
                           'with a temporary file but hide its name in the output',
                           shouldEqualPassWithFileData(':a :b :c.'),
                           '</tmp/node_1_0/0.tmp#a> </tmp/node_2_1/0.tmp#b> </tmp/node_1_0/0.tmp#c>.',
                           '<tmp/1#a> <tmp/2#b> <tmp/1#c>.'),
    
    'when executed with data that results in unused prefixes':
      shouldExecuteEyeWith({},
                           'and remove unused prefixes',
                           [ '--nope', '--pass' ],
                           '@prefix ex1: <http://ex.org/1#>.\n'
                           + '@prefix ex2: <http://ex.org/2#>.\n'
                           + '@prefix ex3: <http://ex.org/3/>.\n'
                           + 'ex2:a ex2:b ex2:c.',
                           '@prefix ex2: <http://ex.org/2#>.\n\n'
                           + 'ex2:a ex2:b ex2:c.'),
    
    'when executed with data that results in prefixes for unhashed namespaces':
      shouldExecuteEyeWith({},
                           'and use the prefixes for unhashed namespaces as well',
                           [ '--nope', '--pass' ],
                           '@prefix ex1: <http://ex.org/1/>.\n'
                           + '@prefix ex2: <http://ex.org/2/>.\n'
                           + '<http://ex.org/1/a> <http://ex.org/2/b> <http://ex.org/1/c>.',
                           '@prefix ex1: <http://ex.org/1/>.\n'
                            + '@prefix ex2: <http://ex.org/2/>.\n\n'
                            + 'ex1:a ex2:b ex1:c.'),
  }
}).export(module);

function executeEyeWith(options, errorText, outputText) {
  return function () {
    var spawner = new SpawnAsserter(),
        eyeInstance = new eye({ spawn: spawner.spawn, keepResources: true }),
        callback = this.callback;
    
    spawner.once('ready', function() {
      errorText && spawner.stderr.emit('data', errorText);
      outputText && spawner.stdout.emit('data', outputText);
      spawner.emit('exit');
    });
    
    return eyeInstance.execute(options, function (err, result) {
      callback(err, result, spawner);
    });
  };
}

function shouldExecuteEyeWith(options, description, expectedArgs, eyeOutput, expectedOutput, error, errorMessage) {
  var context = {
    topic: executeEyeWith(options, error, error ? null : (eyeOutput || "eyeOutput"))
  };

  context['should execute eye ' + description] = function (err, result, spawner) {
    spawner.command.should.eql('eye');
    if(typeof(expectedArgs) !== 'function')
      spawner.args.should.eql(expectedArgs);
    else
      expectedArgs(spawner.args);
  }
  
  if(!error)
    context['should return the eye output'] = function (err, result) {
      should.not.exist(err);
      result.should.equal(expectedOutput || "eyeOutput");
    };
  else
    context['should return the eye error'] = function (err, result) {
      err.should.equal(errorMessage);
      should.not.exist(result);
    };
  
  return context;
}

function shouldEqualPassWithFileData(data) {
  return function(args) {
    args.length.should.eql(3);
    args[2].should.match(/^\/tmp\/\w/);
    fs.readFileSync(args[2], 'utf8').should.eql(data);
    args.should.eql(['--nope', '--pass', args[2]]);
  }
 }

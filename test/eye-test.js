var eye = require('../lib/eye.js');
var vows = require('vows'),
    should = require('should'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    SpawnAsserter = require('./spawnasserter');

vows.describe('Eye').addBatch({
  'The eye module': {
    topic: function () { return eye; },

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
    },

    'should expose flag names': function (eye) {
      eye.should.have.property('flagNames');
      eye.flagNames.should.eql(['nope', 'noBranch', 'noDistinct', 'noQvars',
                                'noQnames', 'quiet', 'quickFalse', 'quickPossible',
                                'quickAnswer', 'think', 'ances', 'ignoreSyntaxError',
                                'pcl', 'strings', 'debug', 'profile', 'version', 'help',
                                'pass', 'passAll']);
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

    'when executed with pass to false':
      shouldExecuteEyeWith({ pass: false },
                           "without 'pass'",
                           ['--nope']),

    'when executed with boolean options':
      shouldExecuteEyeWith({ 'nope': true, 'noBranch': true, 'noDistinct': true,
                             'noQvars': true, 'noQnames': true, 'quiet': true,
                             'quickFalse': true, 'quickPossible': true, 'quickAnswer': true,
                             'think': true, 'ances': true, 'ignoreSyntaxError': true, 'pcl': true,
                             'strings': true, 'debug': true, 'profile': true, 'version': true,
                             'help': true, 'pass': true, 'passAll': true },
                           "should pass the options",
                           ['--nope', '--no-branch', '--no-distinct', '--no-qvars', '--no-qnames',
                            '--quiet', '--quick-false', '--quick-possible', '--quick-answer',
                            '--think', '--ances', '--ignore-syntax-error', '--pcl', '--strings',
                            '--debug', '--profile', '--version', '--help', '--pass', '--pass-all']),

    'when executed with one data URI':
      shouldExecuteEyeWith({ data: 'http://ex.org/1' },
                           "with one data URI",
                           ['--nope', '--pass', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri']),

    'when executed with multiple data URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://ex.org/2'] },
                           "with multiple data URIs",
                           ['--nope', '--pass', 'http://ex.org/1', 'http://ex.org/2',
                                                '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri',
                                                '--wcache', 'http://ex.org/2', 'http://ex.org/2_cachedUri']),

    'when executed with localhost URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://localhost/2', 'https://localhost/3'] },
                           "without the localhost URIs",
                           ['--nope', '--pass', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri']),

    'when executed with 127.0.0.1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://127.0.0.1/2', 'https://127.0.0.1/3'] },
                           "without the 127.0.0.1 URIs",
                           ['--nope', '--pass', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri']),

    'when executed with ::1 URIs':
      shouldExecuteEyeWith({ data: ['http://ex.org/1', 'http://::1/2', 'https://::1/3'] },
                           "without the ::1 URIs",
                           ['--nope', '--pass', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri']),

    'when executed with file URIs':
       shouldExecuteEyeWith({ data: ['http://ex.org/1', 'file://example/'] },
                            "without the file URIs",
                            ['--nope', '--pass', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri']),

    'when executed with a query URI':
      shouldExecuteEyeWith({ query: 'http://ex.org/1' },
                           "with the query URI and without 'pass'",
                           ['--nope', '--query', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri' ]),

    'when executed with multiple query URIs':
      shouldExecuteEyeWith({ query: ['http://ex.org/1', 'http://ex.org/2'] },
                           "with the first query URI and without 'pass'",
                           ['--nope', '--query', 'http://ex.org/1', '--wcache', 'http://ex.org/1', 'http://ex.org/1_cachedUri' ]),

    'when executed with literal data':
      shouldExecuteEyeWith({ data: ':a :b :c.' },
                           'with a temporary file',
                           ['--nope', '--pass', 'tmp/1', '--wcache', 'tmp/1', ':a :b :c._cachedStr']),

    'when executed with data that results in unused prefixes':
      shouldExecuteEyeWith({},
                           'and remove unused prefixes',
                           [ '--nope', '--pass' ],
                           '@prefix ex-1: <http://ex.org/1#>.\n' +
                           '@prefix ex-2: <http://ex.org/2#>.\n' +
                           '@prefix ex-3: <http://ex.org/3/>.\n' +
                           'ex-2:a ex-2:b ex-2:c.',
                           '@prefix ex-2: <http://ex.org/2#>.\n\n' +
                           'ex-2:a ex-2:b ex-2:c.'),

    'when executed with data that results in prefixes for unhashed namespaces':
      shouldExecuteEyeWith({},
                           'and use the prefixes for unhashed namespaces as well',
                           [ '--nope', '--pass' ],
                           '@prefix ex-1: <http://ex.org/1/>.\n' +
                           '@prefix ex-2: <http://ex.org/2/>.\n' +
                           '<http://ex.org/1/a> <http://ex.org/2/b> <http://ex.org/1/c>.',
                           '@prefix ex-1: <http://ex.org/1/>.\n' +
                            '@prefix ex-2: <http://ex.org/2/>.\n\n' +
                            'ex-1:a ex-2:b ex-1:c.'),
    'when execution results in an error':
      shouldExecuteEyeWith({},
                           "should return the error",
                           ['--nope', '--pass'],
                           null, null,
                           "** ERROR ** Message",
                           "Message"),

    'when executed, returns an object that': (function () {
      var spawner = new SpawnAsserter(),
          emitter;
      return {
        topic: function () {
          emitter = new eye({ spawn: spawner.spawn }).execute();
          return { result: emitter, spawner: spawner };
        },
        'should be an EventEmitter': function (param) {
          should.exist(param.result);
          param.result.should.be.an.instanceof(EventEmitter);
        },
        'should terminate the EYE process when canceled': function (param) {
          should.not.exist(param.spawner.killed);
          param.result.cancel();
          should.exist(param.spawner.killed);
          param.spawner.stdout.listeners('data').should.be.empty;
          param.spawner.stderr.listeners('data').should.be.empty;
          param.spawner.stdout.listeners('end').should.be.empty;
          param.spawner.stderr.listeners('end').should.be.empty;
        },
      };
    })(),

    'when executed with multiple failing resources': {
      topic: function () {
        var self = this,
            remaining = 4,
            eyeResult = '',
            resourceCache = {
              cacheFromString: function (s,    callback) { callback('ERR ' + s); cached(); },
              cacheFromUrl   : function (s, t, callback) { callback('ERR ' + s); cached(); },
            };

        function cached() {
          if (!(--remaining))
            self.callback(eyeResult);
        }

        new eye({ resourceCache: resourceCache})
          .execute({ data: ['a', 'b', 'http://a', 'http://b'] }, function (value) {
            eyeResult += value;
          });
      },

      'only the first failing resource should fire the callback': function (err, value) {
        err.should.eql('ERR a');
        should.not.exist(value);
      }
    },
  }
}).export(module);

function executeEyeWith(options, errorText, outputText) {
  var eyeSignature = "Id: euler.yap\n";

  return function () {
    var spawner = new SpawnAsserter(),
        cached = {},
        resourceCache = {
          cacheFromString: function (s, callback) {
            var fileName = s + '_cachedStr';
            cached[fileName] = true;
            process.nextTick(function () { callback(null, fileName); });
          },
          cacheFromUrl: function (u, contentType, callback) {
            var fileName = u + '_cachedUri';
            cached[fileName] = true;
            process.nextTick(function () { callback(null, fileName); });
            contentType.should.eql('text/n3,text/turtle,*/*;q=.1');
          },
          release: function (r) { cached[r].should.be.true; cached[r] = false; }
        },
        eyeInstance = new eye({ spawn: spawner.spawn, resourceCache: resourceCache }),
        callback = this.callback;

    spawner.once('ready', function () {
      spawner.stderr.emit('data', eyeSignature + errorText);
      spawner.stdout.emit('data', outputText);
      spawner.stdout.emit('end');
      spawner.stderr.emit('end');
      spawner.stdout.listeners('data').should.be.empty;
      spawner.stderr.listeners('data').should.be.empty;
      spawner.stdout.listeners('end').should.be.empty;
      spawner.stderr.listeners('end').should.be.empty;
      for (var file in cached)
        cached[file].should.be.false;
    });

    eyeInstance.execute(options, function (err, result) {
      callback(err, result, spawner);
    });
  };
}

function shouldExecuteEyeWith(options, description, expectedArgs, eyeOutput, expectedOutput, error, errorMessage) {
  var context = {
    topic: executeEyeWith(options, error, eyeOutput || "eyeOutput")
  };

  context['should execute EYE ' + description] = function (err, result, spawner) {
    spawner.command.should.eql('eye');
    if (typeof(expectedArgs) !== 'function')
      spawner.args.should.eql(expectedArgs);
    else
      expectedArgs(spawner.args);
  };

  if (!error)
    context['should return the EYE output'] = function (err, result) {
      should.not.exist(err);
      result.should.equal(expectedOutput || "eyeOutput");
    };
  else
    context['should return the EYE error'] = function (err, result) {
      err.should.equal(errorMessage);
      should.not.exist(result);
    };

  return context;
}

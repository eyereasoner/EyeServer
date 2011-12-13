var eyeserver = require('../lib/eyeserver.js');
var vows = require('vows'),
    should = require('should'),
    request = require('request'),
    EventEmitter = require('events').EventEmitter;

vows.describe('EyeServer').addBatch({
  'The eyeserver module': {
    topic: function() { return eyeserver; },
    
    'should be a function': function (eyeserver) {
      eyeserver.should.be.a('function');
    },
    
    'should make EyeServer objects': function (eyeserver) {
      eyeserver().constructor.should.eql(eyeserver);
      eyeserver().should.be.an.instanceof(eyeserver);
    },
    
    'should be an EyeServer constructor': function (eyeserver) {
      new eyeserver().constructor.should.eql(eyeserver);
      new eyeserver().should.be.an.instanceof(eyeserver);
    }
  },
  
  'An EyeServer instance': {
    topic: function () {
      server = new eyeserver({ eye: eyeDummy, debug: true });
      server.listen(13705);
      return server;
    },
    
    teardown: function () {
      server.close();
    },
    
    'receiving a request to /':
      respondsWith(200, 'text/n3', 'without data', { data: [], pass: true }),
    
    'receiving a request to /?quickAnswer':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: true }),
    
    'receiving a request to /?quickanswer':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: true }),
    
    'receiving a request to /?quick-answer':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: true }),
    
    'receiving a request to /?quickAnswer=0':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: false }),
    
    'receiving a request to /?quickanswer=false':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: false }),
    
    'receiving a request to /?quick-answer=1':
      respondsWith(200, 'text/n3', 'with quickAnswer', { data: [], pass: true, quickAnswer: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2Ferror':
      respondsWith(400, 'text/plain', 'and receive an error', { data: ['http://ex.org/error'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1':
      respondsWith(200, 'text/n3', 'with one URI', { data: ['http://ex.org/1'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1,http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1&data=http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }),
    
    'receiving a request to /?data=http%3A%2F%2Fex.org%2F1&data=http%3A%2F%2Fex.org%2F2,http%3A%2F%2Fex.org%2F3':
      respondsWith(200, 'text/n3', 'with three URIs', { data: ['http://ex.org/1', 'http://ex.org/2', 'http://ex.org/3'], pass: true }),
    
    'receiving a request to /?data=%3Aa%20%3Ab%20%3Ac.':
      respondsWith(200, 'text/n3', 'with N3 data', { data: [':a :b :c.'], pass: true }),
    
    'receiving a request to /?query=http%3A%2F%2Fex.org%2F1':
      respondsWith(200, 'text/n3', 'with a query', { data: [], query: 'http://ex.org/1' }),
    
    // note: adding query parameters to obtain unique URIs for test validation
    'receiving a request to /?f1 with form data=http%3A%2F%2Fex.org%2F1':
      respondsWith(200, 'text/n3', 'with one URI', { data: ['http://ex.org/1'], pass: true }, "POST"),
    
    'receiving a request to /?f2 with form data=http%3A%2F%2Fex.org%2F1&data=http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }, "POST"),
    
    'receiving a request to /?f3&data=http%3A%2F%2Fex.org%2F1 with form data=http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', 'http://ex.org/2'], pass: true }, "POST"),
    
    'receiving a request to /?f4&data=http%3A%2F%2Fex.org%2F1 with form data=%3Aa%20%3Ab%20%3Ac.':
      respondsWith(200, 'text/n3', 'with two URIs', { data: ['http://ex.org/1', ':a :b :c.'], pass: true }, "POST"),
    
    'receiving a request to /?f5&data=http%3A%2F%2Fex.org%2F1 with form query=http%3A%2F%2Fex.org%2F2':
      respondsWith(200, 'text/n3', 'with a URI and a query', { data: ['http://ex.org/1'], query: 'http://ex.org/2' }, "POST"),
    
    'receiving a request to /?callback=mycallback':
      respondsWith(200, 'application/javascript', 'without data', { data: [], pass: true }, "GET", 'mycallback("out\\"put")'),
    
    'receiving a request to /?callback=my{illegal}callback':
      respondsWith(400, 'application/javascript', 'without data', { data: [], pass: true }, "GET", 'alert("Illegal callback name.")'),
    
    'receiving an OPTIONS request on /': {
      topic: function () {
        request({ url: 'http://localhost:13705/', method: 'OPTIONS' }, this.callback);
      },
      
      'should respond with Access-Control-Allow-Origin *': function (error, response, body) {
        response.headers.should.have.property('access-control-allow-origin', '*');
      }
    },
    
    'receiving a request that is aborted': (function () {
      var canceled;
      return {
        topic: function () {
          // setup dummy eye with dummy eyeProcess
          var eyeProcess = { cancel: function () { canceled = true; } };
          var server = new eyeserver({ eye: { execute: function () { return eyeProcess; } } });
          // set up dummy request
          var req = new EventEmitter();
          req.query = {};
          server.handleEyeRequest(req, { header: function () {} });
          // abort request
          req.emit('close');
          
          return true;
        },
        'should cancel Eye': function () {
          should.exist(canceled);
        }
      }
    })()
  }
}).export(module);

var eyeDummy = {
  execute: function (options, callback) {
    var path = options.originalUrl;
    delete options.originalUrl;
    this.options[path] = options;
    
    if(this.shouldSucceed[path])
      callback(null, 'out"put');
    else
      callback('err"or', null);
    
    return {};
  },
  options: {},
  shouldSucceed: {}
}

function respondsWith(status, contentType, description, executeArguments, method, output) {
  if(!method) {
    return {
      'using GET' : respondsWith(status, contentType, description, executeArguments, "GET"),
      'using POST': respondsWith(status, contentType, description, executeArguments, "POST")
    };
  }
  
  var path, form, shouldSucceed = (status >= 200 && status <= 299);
  var context = {
    topic: function () {
      var urlMatch = this.context.title.match(/(\/[^ ]*)(?: with form (.*))?/);
      path = urlMatch[1];
      form = urlMatch[2];
      eyeDummy.shouldSucceed[path] = shouldSucceed;
      request({ url: 'http://localhost:13705' + path,
                body: form,
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                method: method }, this.callback);
    }
  };
  
  context['should respond with status ' + status] = function(error, response, body) {
    response.statusCode.should.eql(status);
  }
  
  context['should respond with Content-Type ' + contentType] = function(error, response, body) {
    response.headers.should.have.property('content-type', contentType)
  }
  
  if(contentType !== 'application/javascript')
    context['should respond with Access-Control-Allow-Origin *'] = function(error, response, body) {
      response.headers.should.have.property('access-control-allow-origin', '*');
    }
  
  if(shouldSucceed)
    context['should return the Eye output'] = function(error, response, body) {
      body.should.eql(output || 'out"put\n');
    }
  else
    context['should return the Eye error'] = function(error, response, body) {
      body.should.eql(output || 'err"or\n');
    }
  
  context['should execute Eye ' + description] = function (error, response, body) {
    eyeDummy.options[path].should.eql(executeArguments);
  }
  
  return context;
}

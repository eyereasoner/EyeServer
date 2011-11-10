#!/usr/bin/env node

var spawn = require('child_process').spawn;

var commentRegex = /^#.*$\n/mg,
    errorRegex = /^\*\* ERROR \*\*\s*(.*)$/m;
    
var noArgOptions = ['nope', 'noBranch', 'noDistinct', 'noQvars',
                    'noQnames', 'quiet', 'quickFalse', 'quickPossible',
                    'quickAnswer', 'think', 'ances', 'ignoreSyntaxError',
                    'pcl', 'strings', 'debug', 'profile', 'version', 'help',
                    'pass', 'passAll'];

// An Eye object provides reasoning methods.
function Eye (options) {
  options = options || {};
  
  function F() {};
  F.prototype = Eye.prototype;
  
  var eye = new F();
  eye.spawn = options.spawn;
  return eye;
}

var eyePrototype = Eye.prototype = {
  constructor: Eye,
  
  defaults: {
    nope: true,
    data: []
  },
  
  pass: function (data, onOutput, onError) {
    return this.execute({ data: data, pass: true }, onOutput, onError);
  },
  
  execute: function (options, onOutput, onError) {
    // set correct argument values (options is optional)
    if (typeof(options) === 'function') {
      onError = onOutput;
      onOutput = options;
      options = {};
    }
    
    // add default options if applicable
    options = options || {};
    for(var prop in this.defaults) {
      if (this.defaults.hasOwnProperty(prop) && typeof(options[prop]) === 'undefined') {
        options[prop] = this.defaults[prop];
      }
    }
    
    // set EYE commandline arguments according to options
    var args = [];
    noArgOptions.forEach(function (name) {
      if (options[name]) {
        args.push('--' + name.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    });
    
    // add data URIs
    if(typeof(options.data) === "string")
      options.data = [options.data];

    options.data.forEach(function (url) {
      if(url.match(/^https?:\/\//)) {
        if(url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|[0:]*:1)/))
          return;
        args.push(url);
      }
    });
    
    // start EYE
    var eye = (this.spawn || spawn)('eye', args),
        output = "",
        error = "";
    
    // capture stdout
    eye.stdout.on('data', function (data) {
      output += data;
    });
    
    // capture stderr
    eye.stderr.on('data', function (data) {
      error += data;
    });
    
    // handle exit event by reporting output or error
    eye.once('exit', function (code) {
      eye.stdout.removeAllListeners('data');
      eye.stderr.removeAllListeners('data');
      
      var errorMatch = error.match(errorRegex);
      if (!errorMatch) {
        output = output.replace(commentRegex, '');
        output = output.trim();
        onOutput && onOutput(output);
      }
      else {
        onError && onError(errorMatch[1]);
      }
    });
  }
};

// Expose each of the Eye instance functions also as static functions.
// They behave as instance functions on a new Eye object.
for(var propertyName in eyePrototype) {
  if (eyePrototype.hasOwnProperty(propertyName) && typeof(eyePrototype[propertyName]) === 'function') {
    (function(propertyName) {
      Eye[propertyName] = function () {
        return eyePrototype[propertyName].apply(new Eye(), arguments);
      }
    })(propertyName);
  }
}

module.exports = Eye;

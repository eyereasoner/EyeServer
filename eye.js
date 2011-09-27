#!/usr/bin/env node

var spawn = require('child_process').spawn;

var commentRegex = /^#.*$\n/mg,
    errorRegex = /^\*\* ERROR \*\*.*$/m;
    
var noArgOptions = ['nope', 'noBranch', 'noDistinct', 'noQvars',
                    'noQnames', 'quiet', 'quickFalse', 'quickPossible',
                    'quickAnswer', 'think', 'ances', 'ignoreSyntaxError',
                    'pcl', 'strings', 'debug', 'profile', 'version', 'help',
                    'pass', 'passAll'];

var eye = module.exports = {
  defaults: {
    nope: true,
    pass: false,
    data: []
  },
  
  pass: function (data, onOutput, onError) {
    return this.execute({ data: data, pass: true }, onOutput, onError);
  },
  
  execute: function (params, onOutput, onError) {
    // add default parameters if applicable
    params = params || {};
    for(var prop in this.defaults) {
      if (this.defaults.hasOwnProperty(prop) && typeof(params[prop]) === 'undefined') {
        params[prop] = this.defaults[prop];
      }
    }
    
    // set EYE commandline options according to parameters
    var options = [];
    noArgOptions.forEach(function (name) {
      if (params[name]) {
        options.push('--' + name.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    });
    
    // add data URIs
    params.data.forEach(function (url) {
      if (url.match(/^http:\/\/[^(?:localhost)(?:127\.)]/)) {
        options.push(url);
      }
    });
    
    // start EYE
    var eye = spawn('eye', options),
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
    eye.on('exit', function (code) {
      var errorMatch = error.match(errorRegex);
      if (!errorMatch) {
        output = output.replace(commentRegex, '');
        output = output.trim();
        onOutput(output);
      }
      else {
        onError(errorMatch);
      }
    });
  }
};

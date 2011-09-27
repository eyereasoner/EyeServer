#!/usr/bin/env node

var spawn = require('child_process').spawn;

var commentRegex = /^#.*$\n/mg,
    errorRegex = /^\*\* ERROR \*\*.*$/m;
    
var eye = module.exports = {
  pass: function (data, onOutput, onError) {
    return this.execute({ data: data }, onOutput, onError);
  },
  
  execute: function (params, onOutput, onError) {
    var output = "",
        error = "";
    
    var eye = spawn('eye', ['--pass', '--nope'].concat(params.data || []))

    eye.stdout.on('data', function (data) {
      output += data;
    });

    eye.stderr.on('data', function (data) {
      error += data;
    });

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

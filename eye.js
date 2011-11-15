var spawn = require('child_process').spawn,
    ResourceCache = require('./resourcecache');

var commentRegex = /^#.*$\n/mg,
    localVariableRegex = /<\/tmp\/[^#]+#([^>]+)>/g,
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
  eye.keepResources = options.keepResources;
  eye.resourceCache = new ResourceCache();
  return eye;
}

var eyePrototype = Eye.prototype = {
  constructor: Eye,
  
  defaults: {
    nope: true,
    data: []
  },
  
  pass: function (data, callback) {
    return this.execute({ data: data, pass: true }, callback);
  },
  
  execute: function (options, callback) {
    var thiz = this;
    
    // set correct argument values (options is optional)
    if (typeof(options) === 'function') {
      callback = options;
      options = {};
    }
    
    // add default options if applicable
    options = options || {};
    for(var prop in this.defaults) {
      if (this.defaults.hasOwnProperty(prop) && typeof(options[prop]) === 'undefined') {
        options[prop] = this.defaults[prop];
      }
    }
    
    // do a pass if no query specified, and pass not explicitely disabled
    if (!options.query && typeof(options.pass) === 'undefined')
      options.pass = true;
    
    // set EYE commandline arguments according to options
    var args = [],
        resources = [],
        resourcesPending = 0;
    noArgOptions.forEach(function (name) {
      if (options[name]) {
        args.push('--' + name.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    });
    
    // add data URIs
    if(typeof(options.data) === "string")
      options.data = [options.data];
    options.data.forEach(addDataItem);
    
    // add query URI
    if(typeof(options.query) === "string")
      addDataItem(options.query, '--query');
    else if(options.query instanceof Array)
      addDataItem(options.query[0], '--query');
    
    function addDataItem(dataItem, modifier) {
      // does it contain a protocol name of some sort?
      if(dataItem.match(/^\w+:/)) {
        // is it HTTP(S), but not on a reserved domain?
        if(dataItem.match(/^https?:\/\/(?!localhost|127\.0\.0\.1|[0:]*:1)/)) {
          if(typeof(modifier) === 'string')
            args.push(modifier);
          args.push(dataItem);
        }
      }
      else {
        resourcesPending++;
        thiz.resourceCache.cacheFromString(dataItem, function (err, fileName) {
          if(err)
            return callback(err, null);

          if(typeof(modifier) === 'string')
            args.push(modifier);
          args.push(fileName);
          
          resources.push(fileName);
          resourcesPending--;
          if(!resourcesPending)
            startEye();
        });
      }
    }
    
    if(!resourcesPending)
      startEye();
    
    function startEye() {
      // start EYE
      var eye = (thiz.spawn || spawn)('eye', args),
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
        
        if(!thiz.keepResources) {
          resources.forEach(function (resource) {
            thiz.resourceCache.release(resource);
          });
        }
      
        var errorMatch = error.match(errorRegex);
        if (!errorMatch) {
          output = output.replace(commentRegex, '');
          output = output.replace(localVariableRegex, ':$1');
          output = output.trim();
          callback && callback(null, output);
        }
        else {
         callback(errorMatch[1], null);
        }
      });
    }
  }
}

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

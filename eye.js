var spawn = require('child_process').spawn,
    EventEmitter = require('events').EventEmitter,
    ResourceCache = require('./resourcecache');

var commentRegex = /^#.*$\n/mg,
    localIdentifierRegex = /<\/tmp\/([^#]+)#([^>]+>)/g,
    prefixDeclarationRegex = /@prefix ([\w-]*:) <([^>]+)>.\n/g,
    errorRegex = /^\*\* ERROR \*\*\s*(.*)$/m;
    
var noArgOptions = ['nope', 'noBranch', 'noDistinct', 'noQvars',
                    'noQnames', 'quiet', 'quickFalse', 'quickPossible',
                    'quickAnswer', 'think', 'ances', 'ignoreSyntaxError',
                    'pcl', 'strings', 'debug', 'profile', 'version', 'help',
                    'pass', 'passAll'];

// An Eye object provides reasoning methods.
function Eye (options) {
  options = options || {};
  
  // dummy constructor to enable Eye construction without new
  function F() {};
  F.prototype = Eye.prototype;
  
  // create and return new Eye object
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
    var eye,
        args = [],
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
      eye = (thiz.spawn || spawn)('eye', args);
    
      // capture stdout
      var output = "";
      eye.stdout.on('data', function (data) {
        output += data;
      });
      
      // capture stderr
      var error = "";
      eye.stderr.on('data', function (data) {
        error += data;
      });
    
      // handle exit event by reporting output or error
      eye.once('exit', function (code) {
        eye.stdout.removeAllListeners('data');
        eye.stderr.removeAllListeners('data');
        eye = null;
        
        if(!thiz.keepResources) {
          resources.forEach(function (resource) {
            thiz.resourceCache.release(resource);
          });
        }
      
        var errorMatch = error.match(errorRegex);
        if (!errorMatch) {
          callback && callback(null, thiz.clean(output));
        }
        else {
         callback(errorMatch[1], null);
        }
      });
    }
    
    function stopEye() {
      if(eye) {
        eye.removeAllListeners('exit');
        eye.stdout.removeAllListeners('data');
        eye.stderr.removeAllListeners('data');
        eye.kill();
        eye = null;
      }
    }
    
    // return status object
    var status = new EventEmitter();
    status.cancel = stopEye;
    return status;
  },
  
  clean: function(n3) {
    // remove comments
    n3 = n3.replace(commentRegex, '');
    
    // change local filename identifiers into temporary identifiers
    var localIds = {}, localIdCount = 0;
    n3 = n3.replace(localIdentifierRegex, function (match, path, name) {
      return (localIds[path] || (localIds[path] = '<tmp/' + (++localIdCount) + '#')) + name;
    });
    
    // remove prefix declarations from the document, storing them in an object
    var prefixes = {};
    n3 = n3.replace(prefixDeclarationRegex, function (match, prefix, namespace) {
      prefixes[prefix] = namespace;
      return '';
    });
    
    // remove unnecessary whitespace from the document
    n3 = n3.trim();
    
    // find the used prefixes
    var prefixLines = [];
    for(var prefix in prefixes) {
      var namespace = prefixes[prefix];
      
      // EYE does not use prefixes of namespaces ending in a slash (instead of a hash),
      // so we apply them manually
      if(namespace.match(/\/$/))
        // warning: this could wreck havoc inside string literals
        n3 = n3.replace(new RegExp('<' + escapeForRegExp(namespace) + '(\\w+)>', 'gm'), prefix + '$1');

      // add the prefix if it's used
      // (we conservatively employ a wide definition of "used")
      if(n3.match(prefix))
        prefixLines.push("@prefix ", prefix, " <", namespace, ">.\n");
    }
    
    // join the used prefixes and the rest of the N3
    return !prefixLines.length ? n3 : (prefixLines.join('') + '\n' + n3);
  }
}

Object.defineProperty(Eye, 'flagNames', { value: noArgOptions });

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

function escapeForRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = Eye;

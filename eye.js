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
  eye.resourceCache = options.resourceCache || new ResourceCache();
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
        resourcesPending = 0,
        localResources = 0;
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
          // cache the resource and add it
          thiz.resourceCache.cacheFromUrl(dataItem, addResourceCallback(dataItem, modifier));
        }
      }
      // the data resource is assumed to be N3 now,
      // so a new data resource has to be created from the N3 string
      else {
        // cache the N3 string in a file and add it
        thiz.resourceCache.cacheFromString(dataItem, addResourceCallback("tmp/" + (++localResources), modifier));
      }
    }
    
    // returns a callback that will pass the resource to EYE
    function addResourceCallback(uri, modifier) {
      // since the resource cache file will be created asynchronously,
      // we need to keep track of the number of pending resources.
      resourcesPending++;
      
      // return a callback for resourceCache
      return function (err, cacheFile) {
        if(err)
          return callback(err, null);
        
        // pass possible data modifier (such as '--query')
        if(typeof(modifier) === 'string')
          args.push(modifier);
        // pass the URI of the cached item
        args.push(uri);
        // tell in what file the resource with the URI has been cached
        args.push("--wcache");
        args.push(uri);
        args.push(cacheFile);
      
        // keep track of gathered resources
        resources.push(cacheFile);
        resourcesPending--;
        
        // start EYE if no more resources are pending
        if(!resourcesPending)
          startEye();
      }
    }
    
    // start EYE if no more resources are pending
    if(!resourcesPending)
      startEye();
    
    function startEye() {
      // make sure not to start EYE twice
      if(eye)
        return;
      
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
        
        resources.forEach(function (resource) {
          thiz.resourceCache.release(resource);
        });
      
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

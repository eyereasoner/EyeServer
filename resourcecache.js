var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    url = require('url');

var fileCounter = 0;

function ResourceCache() {
  function F() {};
  F.prototype = ResourceCache.prototype;
  var resourceCache = new F();
  
  process.once('exit', function () {
    resourceCache.destroy();
  });
  
  return resourceCache;
}

ResourceCache.prototype = {
  constructor: ResourceCache,
  
  getDirectoryName: function (callback) {
    var thiz = this;
    
    // check if the directory name was already chosen,
    // or if another getDirectoryName result is pending
    switch(typeof(this.dirName)) {
      // dirName is a string: name aready chosen
      case 'string':
        callback(null, this.dirName);
        return;
      // dirName is a callback function: other result pending
      case 'function':
        // chain this callback to the existing callback
        var oldDirName = this.dirName;
        this.dirName = function(err, dirName) {
          oldDirName(err, dirName);
          callback(err, dirName);
        };
        return;
    }
    
    // indicate getDirectoryName is pending by setting the callback
    this.dirName = callback;
    
    // find a non-existing path
    function findDirectoryName (prefix, counter) {
      path.exists(prefix + counter, function(exists) {
        if(exists)
          findDirectoryName(prefix, counter + 1);
        else
          createDirectory(prefix + counter + '/');
      });
    }
    findDirectoryName('/tmp/node_' + process.pid + '_', 0);
    
    // create the directory and notify callbacks
    function createDirectory (name) {
      fs.mkdir(name, 0755, function(err) {
        // thiz.dirname might contain chained callbacks by now
        callback = thiz.dirName;
        thiz.dirName = name;
        callback(err, name);
      });
    }
  },
  
  cacheFromString: function(data, callback) {
    var thiz = this;
    this.getDirectoryName (function(err, dirName) {
      if(err)
        return callback(err, null);
      
      var fileName = dirName + (thiz.fileId++) + '.tmp';
      thiz.fileNames.push(fileName);
      fs.writeFile(fileName, data, 'utf8', function (err) {
        if(err)
          callback(err, null);
        else
          callback(null, fileName);
      });
    });
  },
  
  cacheFromUrl: function (resourceUrl, callback) {
    var thiz = this;
    
    this.getDirectoryName (function(err, dirName) {
      if(err)
        return callback(err, null);
      
      // determine to URL to fetch
      var urlParts = url.parse(resourceUrl);
      var requestOptions = {
        host: urlParts.hostname,
        port: urlParts.port || 80,
        path: (urlParts.pathname || '') + (urlParts.search || '')
      }
      
      // perform the HTTP GET request
      http.get(requestOptions, function(response) {
        if(response.statusCode != 200) {
          return callback('GET request to ' + resourceUrl + ' failed with status ' + response.statusCode, null);
        }
        
        // read the response data
        var buffers = [],     // list of unwritten data segments
            finished = false; // true if all response has been received
        // try to hold the reponse until the file is ready
        response.pause();
        // when new response data arrives
        response.on('data', function(data) {
          // add to buffers if the file is not ready yet
          if(buffers)
            buffers.push(data);
          // write directly to disk if the file is ready
          else
            fileStream.write(data);
        });
        // when all reponse data has been received
        response.on('end', function () {
          // mark as finished
          finished = true;
          // if the file is ready, close it and fire callback
          if(!buffers) {
            fileStream.end();
            callback(null, fileName);
          }
        });
        
        // create a new file
        var fileName = dirName + (thiz.fileId++) + '.tmp';
        var fileStream = fs.createWriteStream(fileName);
        thiz.fileNames.push(fileName);
        // when it is ready for writing
        fileStream.once('open', function () {
          // write all previously received buffers
          buffers.forEach(function (buffer) {
            fileStream.write(buffer);
          });
          // write directly to the file from now on
          buffers = null;
          // fire the callback if the response is finished
          if(finished) {
            fileStream.end();
            callback(null, fileName);
          }
          // resume the response if not finished
          else {
            response.resume();
          }
        });
      }).on('error', function (err) {
        callback(err, null);
      });
    });
  },
  
  destroy: function () {
    if(typeof(this.dirName) === 'string') {
      this.fileNames.forEach(function (fileName) {
        try {
          fs.unlinkSync(fileName);
        } catch(e) {}
      });
      
      try {
        fs.rmdirSync(this.dirName);
      } catch(e) {}
    }
  },
  
  fileId: 0,
  
  fileNames: []
}

module.exports = ResourceCache;

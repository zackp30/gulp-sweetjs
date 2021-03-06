var fs = require('fs');
var sweet = require('sweet.js');
var gutil = require('gulp-util');
var applySourceMap = require('vinyl-sourcemaps-apply');
var es = require('event-stream');
var merge = require('merge');

module.exports = function(opts) {
  var moduleCache = {};

  opts = merge({
    modules: [],
    readtables: [],
    readableNames: false
  }, opts);

  opts.modules = opts.modules.map(function(mod) {
    if(moduleCache[mod]) {
      return moduleCache[mod];
    }
    moduleCache[mod] = sweet.loadNodeModule(process.cwd(), mod);
    return moduleCache[mod];
  });

  opts.readtables.forEach(function(mod) {
    sweet.setReadtable(mod);
  });

  return es.through(function(file) {
    if(file.isNull()) {
      return this.emit('data', file);
    }
    if(file.isStream()) {
      return this.emit(
        'error',
        new Error('gulp-sweetjs: Streaming not supported')
      );
    }

    var sjsOpts = merge({
      sourceMap: !!file.sourceMap,
      filename: file.path,
    }, opts);

    var dest = gutil.replaceExtension(file.path, '.js');
    try {
      var res = sweet.compile(file.contents.toString('utf8'), sjsOpts);
    }
    catch(err) {
      return this.emit('error', err);
    }

    if(res.sourceMap) {
      var sm = JSON.parse(res.sourceMap);
      sm.file = file.path;
      applySourceMap(file, sm);
    }
      var code;
      for(var i = 0; i < res.length; i++) {
          if (res[i].path === dest) {
              code = res[i].code;
          }
      }

    file.path = dest;
    file.contents = new Buffer(code);
    this.emit('data', file);
  });
};

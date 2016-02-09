'use strict';

/*global require*/
var browserify = require('browserify');
var bundle = require('./bundle');
var glob = require('glob-all');

function build(name, filesGlobPattern, minify) {
    // The poorly-named "debug: true" causes Browserify to generate a source map.
    return bundle(name, browserify({
        entries: glob.sync(filesGlobPattern),
        debug: true,
        extensions: ['.es6', '.jsx']
    }), minify, false);
}

module.exports = build;

'use strict';

/*global require*/
var browserify = require('browserify');
var bundle = require('./bundle');
var watchify = require('watchify');

function watch(name, files, minify) {
    var bundler = watchify(browserify({
        entries: files,
        debug: true,
        cache: {},
        extensions: ['.es6', '.jsx'],
        packageCache: {}
    }), { poll: 1000 } );

    function rebundle() {
        var start = new Date();

        var result = bundle(name, bundler, minify, true);

        result.on('end', function() {
            console.log('Rebuilt ' + name + ' in ' + (new Date() - start) + ' milliseconds.');
        });

        return result;
    }

    bundler.on('update', rebundle);

    return rebundle();
}

module.exports = watch;

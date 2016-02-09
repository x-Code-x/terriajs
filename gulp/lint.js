'use strict';

/*global require*/
var glob = require('glob-all');
var gulp = require('gulp');
var jshint = require('gulp-jshint');

function lint(globPattern) {
    var sources = glob.sync(globPattern);
    return gulp.src(sources)
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
}

module.exports = lint;

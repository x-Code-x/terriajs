/*eslint no-sync: 0*/

'use strict';

/*global require*/

// Every module required-in here must be a `dependency` in package.json, not just a `devDependency`,
// so that our postinstall script (which runs `gulp prepare-cesium`) is able to run without
// the devDependencies available.  Individual tasks, other than `prepare-cesium` and any tasks it
// calls, may require in `devDependency` modules locally.

var child_exec = require('child_process').exec;  // child_process is built in to node
var fs = require('fs');
var gulp = require('gulp');
var resolve = require('resolve');

var specJSName = 'TerriaJS-specs.js';
var sourceGlob = ['./lib/**/*.js', '!./lib/ThirdParty/**/*.js'];
var testGlob = ['./test/**/*.js', '!./test/Utility/*.js'];

gulp.task('copy-cesium-assets', function() {
    var cesium = resolve.sync('terriajs-cesium/wwwroot', {
        basedir: __dirname,
        extensions: ['.'],
        isFile: function(file) {
            try { return fs.statSync(file).isDirectory(); }
            catch (e) { return false; }
        }
    });
    return gulp.src([
            cesium + '/**'
        ], { base: cesium })
        .pipe(gulp.dest('wwwroot/build/Cesium'));
});

gulp.task('build-specs', ['prepare-cesium'], function() {
    var build = require('./gulp/build');
    return build(specJSName, testGlob, false);
});


gulp.task('release-specs', ['prepare-cesium'], function() {
    var build = require('./gulp/build');
    return build(specJSName, testGlob, true);
});

gulp.task('watch-specs', ['prepare-cesium'], function() {
    var watch = require('./gulp/watch');
    return watch(specJSName, testGlob, false);
});

gulp.task('make-schema', function() {
    var generateSchema = require('generate-terriajs-schema');
    return generateSchema({source: '.', dest: 'wwwroot/schema', noversionsubdir: true, quiet: true});
});

gulp.task('lint', function() {
    var lint = require('./gulp/lint');
    return lint(sourceGlob.concat(testGlob));
});

gulp.task('docs', function(done) {
    child_exec('node ./node_modules/jsdoc/jsdoc.js ./lib -c ./jsdoc.json', undefined, done);
});

gulp.task('prepare-cesium', ['copy-cesium-assets']);
gulp.task('build', ['build-specs']);
gulp.task('release', ['release-specs', 'make-schema']);
gulp.task('watch', ['watch-specs']);
gulp.task('default', ['lint', 'build']);

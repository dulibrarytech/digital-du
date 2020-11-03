const gulp = require('gulp'),
      uglify = require('gulp-uglify-es').default,
      javascriptObfuscator = require('gulp-javascript-obfuscator');

var minify_js = function() {
  return gulp.src('./public/assets/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./public/dist/assets/js/'));
}
exports.minify_js = minify_js;

var obfuscate_js = function() {
  return gulp.src('./public/assets/js/*.js')
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./public/dist/assets/js/'));
}
exports.obfuscate_js = obfuscate_js;

var deploy_js = function() {
  return gulp.src('./public/dist/assets/js/*.js')
    .pipe(gulp.dest('./public/assets/js/'));
}
exports.deploy_js = deploy_js;

var minify_view_js = function() {
  return gulp.src('./public/views/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./public/dist/views/'));
}
exports.minify_view_js = minify_js;

var obfuscate_view_js = function() {
  return gulp.src('./public/views/*.js')
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./public/dist/views/'));
}
exports.obfuscate_view_js = obfuscate_js;

var deploy_view_js = function() {
  return gulp.src('./public/dist/views/*.js')
    .pipe(gulp.dest('./public/views/'));
}
exports.deploy_view_js = deploy_js;

gulp.task('deploy_all', gulp.series(obfuscate_js, deploy_js, obfuscate_view_js, deploy_view_js))
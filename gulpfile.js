const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

const browserSync = require('browser-sync').create();

const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

gulp.task('js', function () {
	const bundler = browserify({
		entries: './src/script.js',
		transform: [ babelify ]
	});

	return bundler.bundle()
		.pipe(source('bundle.js'))
		.pipe(buffer())
		.pipe(plugins.sourcemaps.init({ loadMaps: true }))
		.pipe(plugins.sourcemaps.write('./'))
		.pipe(gulp.dest('./dist'))
		.on('end', browserSync.reload);
});

gulp.task('default', gulp.parallel('js'));

if (process.argv.indexOf('--watch') !== -1) {
	gulp.watch('./src/**/*.js', gulp.series('js'));

	browserSync.init({
		server: '.'
	});
}
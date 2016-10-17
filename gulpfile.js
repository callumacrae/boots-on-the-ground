const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();

const browserSync = require('browser-sync').create();

const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

const got = require('got');
const cheerio = require('cheerio');
const streamFromPromise = require('stream-from-promise');

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

gulp.task('war-data', function () {
	const promise = got('http://www.war-memorial.net/wars_all.asp')
		.then(function (res) {
			const $ = cheerio.load(res.body);

			const links = $('.maincol a[title="More about this war."]');
			const linkHrefs = links.map(function () {
				return $(this).attr('href');
			});

			return linkHrefs.get();
		})
		.then(function (links) {
			return links.reduce(function (promiseChain, link) {
				return promiseChain.then(function (wars) {
					console.log(`Downloading ${link}`);

					return got(`http://www.war-memorial.net/${link}`)
						.then(function (res) {
							const $ = cheerio.load(res.body);

							const war = {
								name: $('.rub1').text()
							};

							const warSummary = $('.factbox').first().text();

							const years = /Years: (\d{4})\-(\d{4})/.exec(warSummary);
							if (years) {
								war.years = {
									start: Number(years[1]),
									end: Number(years[2])
								};
							}

							const deaths = /Battle deaths: ([\d,]+)/.exec(warSummary);
							if (deaths) {
								war.deaths = Number(deaths[1].replace(/,/g, ''));
							}

							const nations = $('.factbox a[title="Other wars for this nation"]');
							war.nations = nations.map(function () {
								return /land=([A-Z]{2})&/.exec($(this).attr('href'))[1];
							}).get();

							wars.push(war);

							return wars;
						})
						.then(function (...args) {
							// Add a little delay so we don't hurt anyone
							return new Promise(function (resolve) {
								setTimeout(() => resolve(...args), 500);
							});
						});
				});
			}, Promise.resolve([]));
		})
		.then(function (wars) {
			return JSON.stringify(wars);
		});

	return streamFromPromise(promise)
		.pipe(source('wars.json'))
		.pipe(buffer())
		.pipe(gulp.dest('./data'));
});

gulp.task('default', gulp.parallel('js'));

if (process.argv.indexOf('--watch') !== -1) {
	gulp.watch('./src/**/*.js', gulp.series('js'));

	browserSync.init({
		server: '.'
	});
}
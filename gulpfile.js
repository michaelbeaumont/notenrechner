var gulp = require('gulp');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var jade = require('gulp-jade');
var usemin = require('gulp-usemin');

var dest = './dest';

gulp.task('scripts', function() {
    // Minify and copy all JavaScript (except vendor scripts)
    gulp.src(['js/**/*.json', '!js/vendor/**'])
        .pipe(gulp.dest(dest+'/js'));

    // Copy vendor files
    gulp.src('js/vendor/**')
        .pipe(gulp.dest(dest+'/js/vendor'));
});

//gulp.task('templates', function() {
function templates() {
    return gulp.src('*.jade')
        .pipe(jade());
}

gulp.task('minify', ['scripts'], function() {
    templates()
        .pipe(usemin({
            //assetsDir: './',
            css: [minifyCss(), 'concat'],
            js: [uglify(), 'concat']
        }))
        .pipe(gulp.dest(dest));
});

gulp.task('build', ['minify']);

// The default task (called when you run `gulp`)
gulp.task('default', ['minify']);

gulp.task('dev', function() {
    templates()
        .pipe(gulp.dest('.'));
});

// Watch files and run tasks if they change
gulp.task('watch', ['dev'], function() {
    gulp.watch(['*.jade', 'css/**', 'js/**'], ['dev']);
});

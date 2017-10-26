var gulp = require("gulp");
var stylus = require("gulp-stylus");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var cssnano = require("cssnano");
var browserSync = require("browser-sync").create();

gulp.task("serve", ["stylus"], function() {
  browserSync.init({
    proxy: "localhost:8888"
  });
  gulp.watch("styles/**/*.styl", ["stylus"]);
  gulp.watch("views/**/*.pug").on("change", browserSync.reload);
});

gulp.task("stylus", function() {
  var plugins = [autoprefixer({ browsers: ["last 3 versions"] }), cssnano()];
  return gulp
    .src("styles/style.styl")
    .pipe(stylus())
    .pipe(postcss(plugins))
    .pipe(gulp.dest("public/css"))
    .pipe(browserSync.stream());
});

gulp.task("default", ["serve"]);

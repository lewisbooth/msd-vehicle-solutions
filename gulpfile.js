var gulp = require("gulp")
var stylus = require("gulp-stylus")
var postcss = require("gulp-postcss")
var autoprefixer = require("autoprefixer")
var cssnano = require("cssnano")
var babel = require("gulp-babel")
var minify = require("gulp-minify")
var browserSync = require("browser-sync").create()
require('dotenv').config({ path: 'variables.env' })

gulp.task("scripts", () => {
  return gulp
    .src("views/scripts/src/*.js")
    .pipe(
      babel({
        presets: ["@babel/preset-env"]
      })
    )
    .pipe(minify({ noSource: true }))
    .pipe(gulp.dest("views/scripts/dist"))
})

gulp.task("watch-scripts", gulp.series("scripts"), () => {
  browserSync.reload()
})

gulp.task("stylus", () => {
  var plugins = [
    autoprefixer({ overrideBrowserslist: ["last 3 versions"] }),
    cssnano({ discardUnused: false })
  ]
  return gulp
    .src("styles/*.styl")
    .pipe(stylus())
    .pipe(postcss(plugins))
    .pipe(gulp.dest("public/css"))
    .pipe(browserSync.stream())
})

gulp.task("serve", gulp.series("stylus", "scripts", () => {
  browserSync.init({
    proxy: `localhost:${process.env.PORT}`
  })
  gulp.watch("styles/**/*.styl", gulp.series("stylus"))
  gulp.watch("views/scripts/src/*.js", gulp.series("watch-scripts"))
  gulp.watch("views/**/*.pug").on("change", browserSync.reload)
}))

gulp.task("default", gulp.series("serve"))

const gulp = require("gulp");
const tsmerge = require("./dist/stream");

gulp.task("default", () => {
    return gulp.src(["test-files/typescript.d.ts", "test-files/typescript.js"])
        .pipe(tsmerge())
        .pipe(gulp.dest("test"));
});

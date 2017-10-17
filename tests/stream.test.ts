import {expect} from "chai";
import fs = require("fs");
import gulp = require("gulp");
import gutil = require("gulp-util");
import "mocha";
import {streamFunction} from "../src/stream";
import {MergeOptions} from "../src/utils";

const options: MergeOptions = { extensionPrefix: "stream", logger: "none" };

describe("StreamFunction", () => {

    it("should run with pattern", done => {
        gutil.log = () => { return; };
        gulp
            .src("./tests/assets/file1_raw*")
            .pipe(streamFunction(options))
            .pipe(gulp.dest("tests/temp"))
            .on("end", () => {
                const file1 = fs.existsSync("./tests/temp/file1_raw.stream.d.ts");
                const file2 = fs.existsSync("./tests/temp/file1_raw.stream.js");
                const file3 = fs.existsSync("./tests/temp/file1_raw.stream.js.map");

                expect(file1).to.equal(true);
                expect(file2).to.equal(true);
                expect(file3).to.equal(true);
                done();
            });
    });
});

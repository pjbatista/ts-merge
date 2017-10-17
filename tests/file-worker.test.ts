import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {FileWorker} from "../src/file-worker";
import {MergeOptions} from "../src/utils";

const expectedDts = fs.readFileSync("./tests/assets/file1_expected.d.ts").toString();
const expectedJs = fs.readFileSync("./tests/assets/file1_expected.js").toString();
const expectedJsMap = fs.readFileSync("./tests/assets/file1_expected.js.map").toString();

const options: MergeOptions = { logger: "none" };

describe("FileWorker", () => {

    it("should add declaration files", () => {
        const worker = new FileWorker(options);

        // Test 1: add an existing file
        worker.addDts("./tests/assets/file1_raw.d.ts");
        expect(worker.fileCount).to.equal(1);

        // Test 2: add a non-declaration file
        worker.addDts("./tests/assets/file1_raw.js");
        expect(worker.fileCount).to.equal(1);

        // Test 3: add a non-existing file
        worker.addDts("./tests/assets/i_dont_exist.d.ts");
        expect(worker.fileCount).to.equal(1);

        // Test 4: add a repeated file
        worker.addDts("./tests/assets/file1_raw.d.ts");
        expect(worker.fileCount).to.equal(1);

        // Test 5: only file added should have correct name
        expect(worker.dtsList[0].name).to.equal("file1_raw.d.ts");
    });

    it("should add javascript files", () => {
        const worker = new FileWorker(options);

        // Test 1: add an existing file
        worker.addJs("./tests/assets/file1_raw.js");
        expect(worker.fileCount).to.equal(1);

        // Test 2: add a non-script file
        worker.addJs("./tests/assets/file1_raw.d.ts");
        expect(worker.fileCount).to.equal(1);

        // Test 3: add a non-existing file
        worker.addJs("./tests/assets/i_dont_exist.js");
        expect(worker.fileCount).to.equal(1);

        // Test 4: add a repeated file
        worker.addJs("./tests/assets/file1_raw.js");
        expect(worker.fileCount).to.equal(1);

        // Test 5: only file added should have correct name
        expect(worker.jsList[0].name).to.equal("file1_raw.js");
    });

    it("should add glob patterns (async)", done => {
        const worker = new FileWorker(options);

        // Test 1: add existing files
        worker.addGlobPatterns(files => {
            expect(files.length).to.equal(3);
            expect(worker.fileCount).to.equal(2);

            // Test 2: add existing and non-existing files
            worker.addGlobPatterns(files2 => {
                expect(files2.length).to.equal(2);
                expect(worker.fileCount).to.equal(4);

                // Test 3: add repeated files
                worker.addGlobPatterns(files3 => {
                    expect(files3.length).to.equal(14);
                    expect(worker.fileCount).to.equal(10);

                    done();

                // Test 3
                }, "./tests/assets/*");

            // Test 2
            }, "./tests/assets/we_dont_exist.*", "./tests/assets/file2_raw.*");

        // Test 1
        }, "./tests/assets/file1_raw.*");
    });

    it("should add glob patterns (sync)", () => {
        const worker = new FileWorker(options);

        // Test 1: add existing files
        let files = worker.addGlobPatternsSync("./tests/assets/file1_raw.*");
        expect(files.length).to.equal(3);
        expect(worker.fileCount).to.equal(2);

        // Test 2: add existing and non-existing files
        files = worker.addGlobPatternsSync(
            "./tests/assets/we_dont_exist.*",
            "./tests/assets/file2_raw.*",
        );
        expect(files.length).to.equal(2);
        expect(worker.fileCount).to.equal(4);

        // Test 3: add repeated files
        files = worker.addGlobPatternsSync("./tests/assets/*");
        expect(files.length).to.equal(14);
        expect(worker.fileCount).to.equal(10);
    });

    it("should add multiple files", () => {
        const worker = new FileWorker(options);

        // Test 1: add existing files
        worker.addFiles(
            "./tests/assets/file1_raw.d.ts",
            "./tests/assets/file1_raw.js",
        );
        expect(worker.fileCount).to.equal(2);

        // Test 2: add existing and non-existing files
        worker.addFiles(
            "./tests/assets/file2_raw.d.ts",
            "./tests/assets/file2_raw.js",
            "./tests/assets/i_dont_exist.js",
        );
        expect(worker.fileCount).to.equal(4);
    });

    it("should add single files", () => {
        const worker = new FileWorker(options);

        // Test 1: add two existing files
        worker.addFile("./tests/assets/file1_raw.js");
        worker.addFile("./tests/assets/file1_raw.d.ts");
        expect(worker.fileCount).to.equal(2);

        // Test 2: add a file with an invalid extension
        worker.addFile("./tests/assets/invalid_extension.ts");
        expect(worker.fileCount).to.equal(2);

        // Test 3: add a non-existing file
        worker.addDts("./tests/assets/i_dont_exist.js");
        expect(worker.fileCount).to.equal(2);

        // Test 4: files added should have correct name
        expect(worker.dtsList[0].name).to.equal("file1_raw.d.ts");
        expect(worker.jsList[0].name).to.equal("file1_raw.js");
    });

    it("should work (async)", done => {
        const worker = new FileWorker(options);

        worker.addGlobPatterns(() => {
            worker.work(files => {

                expect(files.length).to.equal(3);
                expect(files[0].contents).to.equal(expectedDts);
                expect(files[1].contents).to.equal(expectedJs);
                expect(files[2].contents).to.equal(expectedJsMap);
                done();
            });
        }, "./tests/assets/file1_raw*");
    });

    it("should work (sync)", () => {
        const worker = new FileWorker(options);

        worker.addGlobPatternsSync("./tests/assets/file1_raw*");
        const files = worker.workSync();

        expect(files.length).to.equal(3);
        expect(files[0].contents).to.equal(expectedDts);
        expect(files[1].contents).to.equal(expectedJs);
        expect(files[2].contents).to.equal(expectedJsMap);
    });

    it("should write", () => {
        const writeOptions: MergeOptions = {
            logger: "none",
            outDir: "./tests/temp",
        };
        const worker = new FileWorker(writeOptions);

        worker.addGlobPatternsSync("./tests/assets/file1_raw*");
        worker.workSync();
        worker.write();

        const file1 = fs.readFileSync("./tests/temp/file1_raw.merged.d.ts").toString();
        const file2 = fs.readFileSync("./tests/temp/file1_raw.merged.js").toString();
        const file3 = fs.readFileSync("./tests/temp/file1_raw.merged.js.map").toString();

        expect(file1).to.equal(expectedDts);
        expect(file2).to.equal(expectedJs);
        expect(file3).to.equal(expectedJsMap);
    });
});

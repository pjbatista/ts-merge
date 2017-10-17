import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {JsProcessor} from "../src/js-processor";
import {File, MergeContext} from "../src/utils";

const expectedJs = fs.readFileSync("./tests/assets/file1_expected.js").toString();
const expectedJs2 = fs.readFileSync("./tests/assets/file2_expected.js").toString();
const expectedJsMap = fs.readFileSync("./tests/assets/file1_expected.js.map").toString();
const expectedJsMapPrefix = fs.readFileSync("./tests/assets/file1_expected_2.js.map").toString();
const expectedJsPrefix = fs.readFileSync("./tests/assets/file1_expected_2.js").toString();
const expectedJsNoMap = fs.readFileSync("./tests/assets/file1_expected_3.js").toString();
const sourceJs = {
    contents: fs.readFileSync("./tests/assets/file1_raw.js").toString(),
    name: "file1_raw.js",
    path: "tests/assets",
};
const sourceJs2 = fs.readFileSync("./tests/assets/file2_raw.js").toString();

const context: MergeContext = new MergeContext({ logger: "none" });

describe("JsProcessor", () => {

    it("should process a long file", function(this: Mocha.ITestCallbackContext) {
        this.timeout(20000);
        const processor = new JsProcessor(sourceJs2, context);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedJs2);
    });

    it("should process a named file", () => {
        const processor = new JsProcessor(sourceJs, context);
        const result = processor.merge() as File;
        const source = processor.sourceMapFile as File;

        // Test 1: Script file
        expect(result.contents).to.equal(expectedJs);
        expect(result.name).to.equal("file1_raw.merged.js");
        expect(result.path).to.equal("tests/assets");

        // Test 2: Map file
        expect(source.contents).to.equal(expectedJsMap);
        expect(source.name).to.equal("file1_raw.merged.js.map");
        expect(source.path).to.equal("tests/assets");
    });

    it("should process a short file", () => {
        const processor = new JsProcessor(sourceJs, context);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedJs);
    });

    it("should process with extensionPrefix", () => {
        const thisContext = new MergeContext({ extensionPrefix: "test", logger: "none" });
        const processor = new JsProcessor(sourceJs, thisContext);
        const result = processor.merge() as File;
        const source = processor.sourceMapFile as File;

        // Test 1: Script file
        expect(result.contents).to.equal(expectedJsPrefix);
        expect(result.name).to.equal("file1_raw.test.js");
        expect(result.path).to.equal("tests/assets");

        // Test 2: Map file
        expect(source.contents).to.equal(expectedJsMapPrefix);
        expect(source.name).to.equal("file1_raw.test.js.map");
        expect(source.path).to.equal("tests/assets");
    });

    it("should process with outDir", () => {
        const thisContext = new MergeContext({ logger: "none", outDir: "tests/temp" });
        const processor = new JsProcessor(sourceJs, thisContext);
        const result = processor.merge() as File;
        const source = processor.sourceMapFile as File;

        // Test 1: Script file
        expect(result.contents).to.equal(expectedJs);
        expect(result.name).to.equal("file1_raw.merged.js");
        expect(result.path).to.equal("tests/temp");

        // Test 2: Map file
        expect(source.contents).to.equal(expectedJsMap);
        expect(source.name).to.equal("file1_raw.merged.js.map");
        expect(source.path).to.equal("tests/temp");
    });

    it("should process with skipDeclarations", () => {
        const thisContext = new MergeContext({ logger: "none", skipDeclarations: true });
        const processor = new JsProcessor(sourceJs, thisContext);
        const result = processor.merge() as File;
        const source = processor.sourceMapFile as File;

        // Test 1: Script file
        expect(result.contents).to.equal(expectedJs);
        expect(result.name).to.equal("file1_raw.merged.js");
        expect(result.path).to.equal("tests/assets");

        // Test 2: Map file
        expect(source.contents).to.equal(expectedJsMap);
        expect(source.name).to.equal("file1_raw.merged.js.map");
        expect(source.path).to.equal("tests/assets");
    });

    it("should process with skipScripts", () => {
        const thisContext = new MergeContext({ logger: "none", skipScripts: true });
        const processor = new JsProcessor(sourceJs, thisContext);
        const result = processor.merge();

        expect(result).to.equal(null);
        expect(processor.sourceMapFile).to.equal(null);
    });

    it("should process with skipSourceMaps", () => {
        const thisContext = new MergeContext({ logger: "none", skipSourceMaps: true });
        const processor = new JsProcessor(sourceJs, thisContext);
        const result = processor.merge() as File;
        const source = processor.sourceMapFile;

        // Test 1: Script file
        expect(result.contents).to.equal(expectedJsNoMap);
        expect(result.name).to.equal("file1_raw.merged.js");
        expect(result.path).to.equal("tests/assets");

        // Test 2: Map file
        expect(source).to.equal(null);
    });
});

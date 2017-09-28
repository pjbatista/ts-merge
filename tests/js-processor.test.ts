import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {JsProcessor} from "../src/js-processor";
import {File, MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("JsProcessor", () => {

    it("short file (with map)", () => {

        const jsExpected = fs.readFileSync("./tests/assets/file1_expected.js").toString();
        const mapExpected = fs.readFileSync("./tests/assets/file1_expected.js.map").toString();
        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        const processor = new JsProcessor({
            contents: raw,
            name: "file1_raw.js",
            path: "tests/assets/",
        }, context);

        const jsResult: File = processor.merge() as File;
        const mapResult: File = processor.sourceMapFile as File;

        expect(jsResult.contents).to.equal(jsExpected);
        expect(mapResult.contents).to.equal(mapExpected);
    });

    it("long file (without map)", () => {

        const expected = fs.readFileSync("./tests/assets/file2_expected.js").toString();
        const raw = fs.readFileSync("./tests/assets/file2_raw.js").toString();
        const processor = new JsProcessor(raw, context);
        const result: File = processor.merge() as File;

        expect(result.contents).to.equal(expected);
    });

    it("extension prefixing (default)", () => {

        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        const file: File = { contents: raw, name: "file1_raw.js", path: "tests/assets/" };
        const processor = new JsProcessor(file, context);
        const jsResult: File = processor.merge() as File;
        const mapResult: File = processor.sourceMapFile as File;

        expect(jsResult.name).to.equal("file1_raw.merged.js");
        expect(mapResult.name).to.equal("file1_raw.merged.js.map");
    });

    it("extension prefixing (empty)", () => {

        const customContext = new MergeContext({ extensionPrefix: "", logger: "none" });

        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        const file: File = { contents: raw, name: "file1_raw.js", path: "tests/assets/" };
        const processor = new JsProcessor(file, customContext);
        const jsResult: File = processor.merge() as File;
        const mapResult: File = processor.sourceMapFile as File;

        expect(jsResult.name).to.equal("file1_raw.js");
        expect(mapResult.name).to.equal("file1_raw.js.map");
    });

    it("with skipScripts", () => {

        const customContext = new MergeContext({ logger: "none", skipScripts: true });

        const file: File = { contents: "", name: "unnamed.js", path: "" };
        const processor = new JsProcessor(file, customContext);
        const result = processor.merge();

        expect(result).to.equal(null);
    });

    it("with skipSourceMaps", () => {

        const customContext = new MergeContext({ logger: "none", skipSourceMaps: true });

        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        const file: File = { contents: raw, name: "file1_raw.js", path: "tests/assets/" };
        const processor = new JsProcessor(file, customContext);
        const jsResult: File = processor.merge() as File;
        const mapResult = processor.sourceMapFile;

        expect(jsResult.name).to.equal("file1_raw.merged.js");
        expect(mapResult).to.equal(null);
    });
});

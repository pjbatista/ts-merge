import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {DtsProcessor} from "../src/dts-processor";
import {File, MergeContext} from "../src/utils";

const expectedDts = fs.readFileSync("./tests/assets/file1_expected.d.ts").toString();
const expectedDts2 = fs.readFileSync("./tests/assets/file2_expected.d.ts").toString();
const sourceDts = fs.readFileSync("./tests/assets/file1_raw.d.ts").toString();
const sourceDts2 = fs.readFileSync("./tests/assets/file2_raw.d.ts").toString();

const context: MergeContext = new MergeContext({ logger: "none" });

describe("DtsProcessor", () => {

    it("should process a long file", () => {
        const processor = new DtsProcessor(sourceDts2, context);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts2);
    });

    it("should process a named file", () => {
        const fileData = {
            contents: sourceDts,
            name: "test.d.ts",
            path: "tests/assets",
        };
        const processor = new DtsProcessor(fileData, context);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
        expect(result.name).to.equal("test.merged.d.ts");
        expect(result.path).to.equal("tests/assets");
    });

    it("should process a short file", () => {
        const processor = new DtsProcessor(sourceDts, context);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
    });

    it("should process with extensionPrefix", () => {
        const fileData = {
            contents: sourceDts,
            name: "test.d.ts",
            path: "tests/assets",
        };
        const thisContext = new MergeContext({ extensionPrefix: "test", logger: "none" });
        const processor = new DtsProcessor(fileData, thisContext);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
        expect(result.name).to.equal("test.test.d.ts");
        expect(result.path).to.equal("tests/assets");
    });

    it("should process with outDir", () => {
        const fileData = {
            contents: sourceDts,
            name: "test.d.ts",
            path: "tests/assets",
        };
        const thisContext = new MergeContext({ logger: "none", outDir: "test/temp" });
        const processor = new DtsProcessor(fileData, thisContext);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
        expect(result.name).to.equal("test.merged.d.ts");
        expect(result.path).to.equal("test/temp");
    });

    it("should process with skipDeclarations", () => {
        const thisContext = new MergeContext({ logger: "none", skipDeclarations: true });
        const processor = new DtsProcessor(sourceDts, thisContext);
        const result = processor.merge();

        expect(result).to.equal(null);
    });

    it("should process with skipScripts", () => {
        const fileData = {
            contents: sourceDts,
            name: "test.d.ts",
            path: "tests/assets",
        };
        const thisContext = new MergeContext({ logger: "none", skipScripts: true });
        const processor = new DtsProcessor(fileData, thisContext);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
        expect(result.name).to.equal("test.merged.d.ts");
        expect(result.path).to.equal("tests/assets");
    });

    it("should process with skipSourceMaps", () => {
        const fileData = {
            contents: sourceDts,
            name: "test.d.ts",
            path: "tests/assets",
        };
        const thisContext = new MergeContext({ logger: "none", skipSourceMaps: true });
        const processor = new DtsProcessor(fileData, thisContext);
        const result = processor.merge() as File;

        expect(result.contents).to.equal(expectedDts);
        expect(result.name).to.equal("test.merged.d.ts");
        expect(result.path).to.equal("tests/assets");
    });
});

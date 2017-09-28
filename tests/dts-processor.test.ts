import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {DtsProcessor} from "../src/dts-processor";
import {File, MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("DtsProcessor", () => {

    it("short file", () => {

        const expected = fs.readFileSync("./tests/assets/file1_expected.d.ts").toString();
        const raw = fs.readFileSync("./tests/assets/file1_raw.d.ts").toString();
        const processor = new DtsProcessor(raw, context);
        const result: File = processor.merge() as File;

        expect(result.contents).to.equal(expected);
    });

    it("long file", () => {

        const expected = fs.readFileSync("./tests/assets/file2_expected.d.ts").toString();
        const raw = fs.readFileSync("./tests/assets/file2_raw.d.ts").toString();
        const processor = new DtsProcessor(raw, context);
        const result: File = processor.merge() as File;

        expect(result.contents).to.equal(expected);
    });

    it("extension prefixing (default)", () => {

        const raw = fs.readFileSync("./tests/assets/file1_raw.d.ts").toString();
        const file: File = { contents: raw, name: "file1_raw.d.ts", path: "" };
        const processor = new DtsProcessor(file, context);
        const result: File = processor.merge() as File;

        expect(result.name).to.equal("file1_raw.merged.d.ts");
    });

    it("extension prefixing (empty)", () => {

        const customContext = new MergeContext({ extensionPrefix: "", logger: "none" });

        const raw = fs.readFileSync("./tests/assets/file1_raw.d.ts").toString();
        const file: File = { contents: raw, name: "file1_raw.d.ts", path: "" };
        const processor = new DtsProcessor(file, customContext);
        const result: File = processor.merge() as File;

        expect(result.name).to.equal("file1_raw.d.ts");
    });

    it("with skipDeclarations", () => {
        const customContext = new MergeContext({ logger: "none", skipDeclarations: true });

        const file: File = { contents: "", name: "unnamed.d.ts", path: "" };
        const processor = new DtsProcessor(file, customContext);
        const result = processor.merge();

        expect(result).to.equal(null);
    });
});

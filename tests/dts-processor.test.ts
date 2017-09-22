import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {DtsProcessor} from "../src/dts-processor";
import {MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("DtsProcessor", () => {

    it("file1: merge and check", () => {

        const expected = fs.readFileSync("./tests/assets/file1_expected.d.ts").toString();
        const raw = fs.readFileSync("./tests/assets/file1_raw.d.ts").toString();
        const processor = new DtsProcessor(raw, context);
        const result = processor.merge().contents;

        expect(result).to.equal(expected);
    });

    it("file2: merge and check", () => {

        const expected = fs.readFileSync("./tests/assets/file2_expected.d.ts").toString();
        const raw = fs.readFileSync("./tests/assets/file2_raw.d.ts").toString();
        const processor = new DtsProcessor(raw, context);
        const result = processor.merge().contents;

        expect(result).to.equal(expected);
    });

    it("stress test", () => {

        const expected = fs.readFileSync("./tests/assets/file2_expected.d.ts").toString();
        const raw = fs.readFileSync("./tests/assets/file2_raw.d.ts").toString();
        const processor = new DtsProcessor(raw, context);
        let result;

        for (let i = 0; i < 1000; i += 1) {
            result = processor.merge().contents;
        }

        expect(result).to.equal(expected);
    });
});

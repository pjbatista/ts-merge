import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {JsProcessor} from "../src/js-processor";
import {MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("JsProcessor", () => {

    it("file1: merge and check", () => {

        const expected1 = fs.readFileSync("./tests/assets/file1_expected.js").toString();
        const expected2 = fs.readFileSync("./tests/assets/file1_expected.js.map").toString();
        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        const processor = new JsProcessor({
            contents: raw,
            name: "file1_raw.js",
            path: "tests/assets/",
        }, context);

        const result1 = processor.merge().contents;
        const result2 = (processor.sourceMapFile as any).contents;

        expect(result1).to.equal(expected1);
        expect(result2).to.equal(expected2);
    });

    it("file2: merge and check", () => {

        const expected = fs.readFileSync("./tests/assets/file2_expected.js").toString();
        const raw = fs.readFileSync("./tests/assets/file2_raw.js").toString();
        const processor = new JsProcessor(raw, context);
        const result = processor.merge().contents;

        expect(result).to.equal(expected);
    });

    it("stress test", () => {

        const expected = fs.readFileSync("./tests/assets/file1_expected2.js").toString();
        const raw = fs.readFileSync("./tests/assets/file1_raw.js").toString();
        context.options.skipSourceMaps = true;
        const processor = new JsProcessor(raw, context);

        let result;

        for (let i = 0; i < 1000; i += 1) {
            result = processor.merge().contents;
        }

        expect(result).to.equal(expected);
    });
});

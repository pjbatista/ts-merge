import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {FileWorker} from "../src/file-worker";
import {MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("FileWorker", () => {

    it("add", () => {
        const worker = new FileWorker(context);

        worker.addDts("./tests/assets/file1_raw.d.ts");
        expect(worker.dtsList.length).to.equal(1);

        worker.addFile("./tests/assets/file2_raw.d.ts");
        expect(worker.dtsList.length).to.equal(2);

        worker.addJs("./tests/assets/file1_raw.js");
        worker.addJs("./tests/assets/file2_raw.js");
        expect(worker.jsList.length).to.equal(2);

        worker.addGlobPatterns(() => {
            expect(worker.jsList.length).to.equal(4);
        }, ["./tests/assets/*_expected.js"]);
    });

    it("work (async)", () => {
        const worker = new FileWorker(context);

        worker.addGlobPatterns(() => {
            worker.work(files => {
                expect(files.length).to.equal(4);
            });
        }, ["./tests/assets/*_raw.*"]);
    });

    it("work (sync)", () => {
        const worker = new FileWorker(context);

        worker.addGlobPatterns(() => {

            const files = worker.workSync();
            expect(files.length).to.equal(4);
        }, ["./tests/assets/*_raw.*"]);
    });

    it("write and check", () => {
        const worker = new FileWorker(context);

        worker.addJs("./tests/assets/file1_raw.js");
        worker.work(files => {
            for (const file of files) {
                file.path = "./tests/temp";
            }

            worker.write(files);
            const expected = fs.readFileSync("./tests/assets/file1_expected.js").toString();
            const result = fs.readFileSync("./tests/temp/file1_raw.merged.js").toString();

            expect(expected).to.equal(result);
        });
    });
});

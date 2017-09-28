import {expect} from "chai";
import fs = require("fs");
import "mocha";
import {FileWorker} from "../src/file-worker";
import {File, LogLevel, MergeContext} from "../src/utils";

const context = new MergeContext({ logger: "none" });

describe("FileWorker", () => {

    it("add methods", () => {
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

    it("write", () => {
        const worker = new FileWorker(context);

        worker.addGlobPatterns(() => {
            worker.work(files => {
                for (const file of files) {
                    file.path = "./tests/temp";
                }

                worker.write(files);

                for (const file of files) {

                    const source = file.source as File;

                    let expected = source.path + "/" + source.name.replace("raw", "expected");
                    expected = fs.readFileSync(expected).toString();

                    let result = file.path + "/" + file.name;
                    result = fs.readFileSync(result).toString();

                    expect(result).to.equal(expected);
                }
            });
        }, ["./tests/assets/*_raw.*"]);
    });

    it("with skipDeclarations and skipScripts", () => {

        const customContext = new MergeContext({
            logger: "none",
            skipDeclarations: true,
            skipScripts: true,
        });

        const worker = new FileWorker(customContext);
        worker.addGlobPatterns(() => {
            worker.work(files => {
                expect(files.length).to.equal(0);
            });
        }, ["./tests/assets/*_raw.*"]);
    });

    it("custom logger", () => {

        let first = true;

        const customContext = new MergeContext({
            logger: (message: string, logLevel?: LogLevel) => {

                if (logLevel === LogLevel.Verbose) {
                    return;
                }

                let expected: string;
                const sep: string = process.platform === "win32" ? "\\" : "/";

                if (first) {
                    expected = `Initializing merging of file 'tests${sep}assets/file1_raw.js'`;
                    expect(message).to.equal(expected);
                    first = false;
                    return;
                }

                expected = `Total block merges for 'tests${sep}assets/file1_raw.js': 4`;
                expect(message).to.equal(expected);
            },
        });

        const worker = new FileWorker(customContext);
        worker.addFile("./tests/assets/file1_raw.js");
        worker.workSync();
    });
});

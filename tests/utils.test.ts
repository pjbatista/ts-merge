import {expect} from "chai";
import "mocha";
import {LogLevel, MergeContext} from "../src/utils";

describe("MergeContext", () => {

    it("should log and store errors", () => {
        const context = new MergeContext({ logger: "none" });
        context.error("Test error");
        context.error("Test error 2");

        expect(context.hasErrors).to.equal(true);
        expect(context.errors.length).to.equal(2);
        expect(context.errors[0].message).to.equal("Test error");
        expect(context.errors[1].message).to.equal("Test error 2");
    });

    it("should log messages", done => {
        const context = new MergeContext({
            logger: (message, level) => {
                expect(message).to.equal("Test message");
                expect(level).to.equal(LogLevel.Warning);

                done();
            },
        });

        context.log("Test message", LogLevel.Warning);
    });

    it("should initialize with custom options", () => {
        const context = new MergeContext({
            extensionPrefix: "test",
            logger: "none",
            outDir: "nowhere",
            skipDeclarations: true,
            skipScripts: true,
            skipSourceMaps: true,
        });

        expect(context.options.extensionPrefix).to.equal("test");
        expect(context.options.logger).to.equal("none");
        expect(context.options.outDir).to.equal("nowhere");
        expect(context.options.skipDeclarations).to.equal(true);
        expect(context.options.skipScripts).to.equal(true);
        expect(context.options.skipSourceMaps).to.equal(true);
    });

    it("should initialize with default options", () => {
        const context = new MergeContext();

        expect(context.options.extensionPrefix).to.equal("merged");
        expect(context.options.logger).to.equal("console");
        expect(context.options.outDir).to.equal(undefined);
        expect(context.options.skipDeclarations).to.equal(false);
        expect(context.options.skipScripts).to.equal(false);
        expect(context.options.skipSourceMaps).to.equal(false);
    });

});

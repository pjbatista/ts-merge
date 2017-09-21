import {File, LogLevel, MergeContext, MergeProcessor} from "./utils";

const merger = require("typescript-module-merger");

/**
 * Represents the processor for transpiled JavaScript files.
 *
 * It optimizes the script blocks, allowing statements with the same declaration to be merged.
 *
 * First, the processor will look for TypeScript transpiled IIFE blocks:
 *
 * ```javascript
 * var myModule;
 * (function (myModule) {[body0]})(myModule || (myModule = {}));
 * (function (myModule) {[body1]})(myModule || (myModule = {}));
 * ...
 * (function (myModule) {[bodyN]})(myModule || (myModule = {}));
 * ```
 * Then, using {@link merge} it will optmize all blocks with the same module name:
 *
 * ```javascript
 * var myModule;
 * (function (myModule) {[body0;body1;...;bodyN]})(myModule || (myModule = {}));
 * ```
 */
export class JsProcessor implements MergeProcessor {

private static _unnamedCount = 0;

    private _context: MergeContext;
    private _file: File;

    /**
     * Initializes a new instance of the {@link JsProcessor} class, using the input file as content
     * source for the merging.
     *
     * @param file
     *   A string with the file contents or a {@link InputFile} object.
     * @param context
     *   Context object used throughout mergings.
     */
    public constructor(file: File | string, context?: MergeContext) {

        if (typeof(file) === "string") {
            JsProcessor._unnamedCount += 1;
            const fileName = "unnamed" + JsProcessor._unnamedCount.toString() + ".js";

            file = {
                contents: file.toString(),
                name: fileName,
                path: "",
                size: file.toString().length,
            };
        }

        this._context = context || new MergeContext();
        this._file = file;
    }

    public async merge(): Promise<File> {

        const filePath = this._file.path + "/" + this._file.name;
        this._log(`Initializing merging of file '${filePath}'`);

        const data = this._file.contents;
        const merged = merger.mergeModules(data);

        this._log(`Merged IIFE blocks of '${filePath}'`);

        return await {
            contents: merged,
            name: this._file.name.replace(".js", ".merged.js"),
            path: this._file.path,
            source: this._file.source,
        };
    }

    // Context log shortcut method
    private _log(message: string, level: LogLevel = LogLevel.Information) {
        this._context.log(message, level);
    }
}

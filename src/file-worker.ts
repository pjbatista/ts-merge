import fs = require("fs");
import glob = require("glob");
import path = require("path");

import {DtsProcessor} from "./dts-processor";
import {JsProcessor} from "./js-processor";
import {File, LogLevel, MergeContext} from "./utils";

/**
 * Represents worker objects that are able to control merging processors for multiple files.
 */
export class FileWorker {

    private _context: MergeContext;
    private _dtsList: Array<string | File> = [];
    private _jsList: Array<string | File> = [];
    private _skipped: File[] = [];

    /** Gets the declaration (d.ts) files to be merged. */
    public get dtsList(): ReadonlyArray<string | File> { return this._dtsList; }

    /** Gets the javascript (.js) files to be merged. */
    public get jsList(): ReadonlyArray<string | File> { return this._jsList; }

    /** Gets the javascript (.js) files to be merged. */
    public get skipped() { return this._skipped; }

    /**
     * Initializes a new instance of the {@link FileWorker} class, using the given context or
     * creating one.
     *
     * @param context
     *   Context object to be used throughout merging operations.
     */
    public constructor(context?: MergeContext) {

        this._context = context || new MergeContext();
    }

    /**
     * Adds a declaration (d.ts) file to the file worker object.
     *
     * @param filePath
     *   Path to file object to be added.
     */
    public addDts(filePath: string) {

        if (!fs.existsSync(filePath)) {
            this._context.log(`File '${filePath}' does not exist. Skipping`, LogLevel.Warning);
            return;
        }

        if (filePath.substr(filePath.length - 4, 4).toLowerCase() !== "d.ts") {
            this._context.log(`File '${filePath}' extension is not d.ts`, LogLevel.Warning);
        }

        this._dtsList.push(filePath);
    }

    /**
     * Adds all files that matches the given glob patterns.
     *
     * @param callback
     *   Function to be called once the glob finished adding files to the queue.
     * @param patterns
     *   One or more string with glob patterns containing files to be added.
     */
    public addGlobPatterns(callback: () => void, patterns: string[]) {

        let count = 0;
        const workingDir = process.cwd();

        for (const pattern of patterns) {
            glob(
                pattern,
                {
                    ignore: "**/*.merged.*",
                    root: workingDir,
                },
                (error: Error | null, files: string[]) => {

                if (error !== null) {
                    this._context.error(error);
                    return;
                }

                for (const file of files) {

                    const extension = path.extname(file).toLowerCase();

                    if (extension === ".js") {
                        count += 1;
                        this._jsList.push(file);
                    }

                    if (extension === ".ts") {
                        count += 1;
                        this._dtsList.push(file);
                    }
                }

                this._context.log(`Added ${count} file(s) to the queue`);
                callback();
            });
        }
    }

    /**
     * Adds a javascript (.js) file to the file worker object.
     *
     * @param filePath
     *   Path to file object to be added.
     */
    public addJs(filePath: string) {

        if (!fs.existsSync(filePath)) {
            this._context.log(`File '${filePath}' does not exist. Skipping`, LogLevel.Warning);
            return;
        }

        if (path.extname(filePath).toLowerCase() !== ".js") {
            this._context.log(`File '${filePath}' extension is not js`, LogLevel.Warning);
        }

        this._jsList.push(filePath);
    }

    /**
     * Performs the processing of all the files in the file worker queue, and saves the files
     * according to the output options.
     *
     * @param callback
     *   A function to be called once the work and saving is done.
     */
    public workAndSave(callback?: () => void) {

        this._prepareWork(files => {

            this._write(files);
            if (callback) { callback(); }
        });
    }

    // Generator that creates the processors for each file
    private *_doWork() {

        for (const dtsFile of this._dtsList) {
            const dtsProcessor = new DtsProcessor(this._read(dtsFile), this._context);
            yield dtsProcessor.merge();
        }

        for (const jsFile of this._jsList) {
            const jsProcessor = new JsProcessor(this._read(jsFile), this._context);
            yield jsProcessor.merge();
        }
    }

    // Prepares all files to be saved
    private _prepareWork(callback: (results: File[]) => void) {

        const results: File[] = [];
        const workGenerator = this._doWork();

        let count = 0;
        let promise = workGenerator.next();
        let total = 0;

        while (!promise.done) {

            promise.value
                .then(value => {
                    count += 1;
                    value.size = value.contents.length;
                    results.push(value);

                    if (count === total) {
                        callback(results);
                        return;
                    }
                })
                .catch(error => {
                    this._context.error(error);
                });

            total += 1;
            promise = workGenerator.next();
        }
    }

    // Reads the specified file path or object
    private _read(file: string | File) {

        let data = "";

        if (typeof(file) === "string") {
            data = fs.readFileSync(file).toString();

            file = {
                contents: data,
                name: path.basename(file),
                path: path.dirname(file),
                size: data.length,
            };
        }

        if (typeof(file) === "object") {
            data = file.contents;
        }

        file.contents = data;
        return file;
    }

    // Writes the merged files
    private _write(files: File[]) {

        for (const file of files) {

            if (!file.name) {
                this._skipped.push(file);
                continue;
            }

            const filePath = file.path + "/" + file.name;

            if (file.source) {

                const sourceSize = file.source.size;
                this._context.log(`${filePath}: (${file.size} bytes (from ${sourceSize} bytes)).`);
            }

            fs.writeFileSync(filePath, file.contents);
        }

        if (this._skipped.length > 0) {
            this._context.log(`Skipped ${this._skipped.length} files due to unknown file name`,
                LogLevel.Verbose);
        }
    }
}

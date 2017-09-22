import fs = require("fs");
import glob = require("glob");
import path = require("path");

import {DtsProcessor} from "./dts-processor";
import {JsProcessor} from "./js-processor";
import {File, LogLevel, MergeContext, Timer} from "./utils";

/**
 * Represents worker objects that are able to control merging processors for multiple files,
 * scripts and declarations alike.
 *
 * Using this object is probably the best way to work with multiple file mergings while avoiding
 * clogging Node's heap due to the heavy nature of this plugin.
 */
export class FileWorker {

    private _context: MergeContext;
    private _dtsList: Array<string | File> = [];
    private _jsList: Array<string | File> = [];
    private _skipped: File[] = [];
    private _timer: Timer;

    /** Gets the declaration (d.ts) file array to be merged. */
    public get dtsList(): ReadonlyArray<string | File> { return this._dtsList; }

    /** Gets the javascript (.js) file array to be merged. */
    public get jsList(): ReadonlyArray<string | File> { return this._jsList; }

    /**
     * Gets an array with the files that were not saved during {@link write} because their name
     * and/or path were not specified.
     */
    public get unsaved() { return this._skipped; }

    /** Gets the timer object that keeps track of the time spent while working. */
    public get timer() { return this._timer; }

    /**
     * Initializes a new instance of the {@link FileWorker} class, using the given context object or
     * creating one with the default options.
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
     * Adds a single file to the worker object.
     *
     * @param filePath
     *   String with the path to the file to be added.
     */
    public addFile(filePath: string) {

        const cwd = process.cwd();
        filePath = path.relative(cwd, filePath);

        if (filePath.substr(filePath.length - 4, 4).toLowerCase() === "d.ts") {
            this.addDts(filePath);
            return;
        }

        if (path.extname(filePath).toLowerCase() === ".js") {
            this.addJs(filePath);
            return;
        }
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
        const ignored = `**/*.${this._context.options.extensionPrefix}.*`;
        const workingDir = process.cwd();

        for (const pattern of patterns) {
            glob(
                pattern,
                {
                    ignore: ignored,
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
     * Performs the processing of all the files in the file worker queue, and retrieves the
     * resulting files through the asynchronous callback.
     *
     * @param callback
     *   A function to be called once the work is done.
     */
    public work(callback: (files: File[]) => void) {

        const files: File[] = [];

        this._prepareWork(
            file => {
                if (!(file instanceof Array)) {
                    file = [file];
                }

                files.push.apply(files, file);
            },
            () => {
                callback(files);
            },
        );
    }

    /**
     * @deprecated
     * @see {work}
     */
    public workAndSave(callback?: () => void) {
        this.work(files => {
            this.write(files);

            if (callback) {
                callback();
            }
        });
    }

    /**
     * Performs the processing of all the files in the file worker queue, and retrieves the
     * resulting files synchronously.
     *
     * @param callback
     *   A function to be called once the work is done.
     */
    public workSync() {

        const files: File[] = [];
        let done = false;

        this._prepareWork(
            file => {
                files.push.apply(files, file);
            },
            () => {
                done = true;
            },
        );

        while (!done) {}

        return files;
    }

    /**
     * Writes the given file list to the disk.
     *
     * @param files
     *   A string or array of string with the files to be writen.
     */
    public write(files: File | File[]) {

        if (!(files instanceof Array)) {
            files = [files];
        }

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

            if (!fs.existsSync(file.path)) {
                fs.mkdirSync(file.path);
            }

            fs.writeFileSync(filePath, file.contents);
        }
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
            yield jsProcessor.sourceMapFile;
        }
    }

    // Prepares all files to be saved
    private _prepareWork(
        fileCallback: (results: File | File[]) => void,
        doneCallback?: () => void,
    ) {

        this._timer = new Timer();

        const workGenerator = this._doWork();
        let promise = workGenerator.next();

        while (!promise.done) {

            if (promise.value !== null) {
                fileCallback(promise.value);
            }

            promise = workGenerator.next();
        }

        this._timer.end();

        if (doneCallback) {
            doneCallback();
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
}

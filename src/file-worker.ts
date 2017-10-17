import fs = require("fs");
import glob = require("glob");
import path = require("path");
import {Timer} from "timecount";
import {DtsProcessor} from "./dts-processor";
import {JsProcessor} from "./js-processor";
import {File, LogLevel, MergeContext, MergeOptions} from "./utils";

/**
 * Represents worker objects that are able to control merging processors for multiple files,
 * scripts and declarations alike.
 *
 * Using this object is probably the best way to work with multiple file mergings while avoiding
 * clogging Node's heap due to the heavy nature of this plugin.
 *
 * ### Sync:
 *
 * ```javascript
 * var tsmerge = require("ts-merge");
 *
 * var worker = new tsmerge.FileWorker({ outDir: "dist/postbuild" });
 * worker.addFiles("myfile.d.ts", "myfile2.js", "myfile3.js")
 * worker.workSync();
 * worker.write();
 * ```
 *
 * ### Async:
 *
 * ```javascript
 * var tsmerge = require("ts-merge");
 *
 * var worker = new tsmerge.FileWorker({ outDir: "dist/postbuild" });
 * worker.addFiles("myfile.d.ts", "myfile2.js", "myfile3.js")
 * worker.work(function(files) {
 *     for (var i = 0; i < files.length; i++) {
 *         console.log(files[i].name);
 *     }
 * 
 *     // Output:
 *     //   myfile.merged.d.ts
 *     //   myfile2.merged.js
 *     //   myfile3.merged.js
 *
 *     worker.write();
 * })
 * ```
 */
export class FileWorker {

    private _context: MergeContext;
    private _dtsList: File[] = [];
    private _filePaths: string[] = [];
    private _jsList: File[] = [];
    private _mergedFiles: File[] = [];
    private _skipped: File[] = [];
    private _timer: Timer;

    /** Gets the declaration (d.ts) file array to be merged. */
    public get dtsList(): ReadonlyArray<File> { return this._dtsList; }

    /** Gets the number of files currently in the work queue. */
    public get fileCount(): number { return this._filePaths.length; }

    /** Gets the javascript (.js) file array to be merged. */
    public get jsList(): ReadonlyArray<File> { return this._jsList; }

    /**
     * Gets an array with the files that were not saved during {@link write} because their name
     * and/or path were not specified.
     */
    public get unsaved() { return this._skipped; }

    /** Gets the timer object that keeps track of the time spent while working. */
    public get timer() { return this._timer; }

    /**
     * Initializes a new instance of the {@link FileWorker} class, using the given options to
     * configure its mergeContext
     *
     * @param options
     *   Options object used to configure this worker's context.
     */
    public constructor(options?: MergeOptions);

    /**
     * Initializes a new instance of the {@link FileWorker} class, using the given context object.
     *
     * @param context
     *   Context object to be used throughout merging operations.
     */
    public constructor(context?: MergeContext);

    /**
     * Initializes a new instance of the {@link FileWorker} class, using the given context object
     * -or- the given options object.
     *
     * @param contextOrOptions
     *   Context object to be used throughout merging operations -or- options object used to
     *   configure this worker's context.
     */
    public constructor(contextOrOptions?: MergeContext | MergeOptions) {

        contextOrOptions = contextOrOptions || {};

        if (contextOrOptions instanceof MergeContext) {
            this._context = contextOrOptions;
            return;
        }

        this._context = new MergeContext(contextOrOptions);
    }

    /**
     * Adds a declaration (d.ts) file to the file worker object.
     *
     * @param file
     *   Path to file or file object to be added.
     */
    public addDts(file: string) {

        if (!fs.existsSync(file)) {
            this._context.log(`File '${file}' does not exist. Skipping`, LogLevel.Warning);
            return;
        }

        if (file.substr(file.length - 5).toLowerCase() !== ".d.ts") {
            this._context.log(`File '${file}' extension is not d.ts`, LogLevel.Warning);
            return;
        }

        const cwd = process.cwd();
        file = path.relative(cwd, file);

        if (this._filePaths.indexOf(file) > -1) {
            this._context.log(`File '${file}' is already being processed`, LogLevel.Information);
            return;
        }

        const fileObject = {
            contents: fs.readFileSync(file).toString(),
            name: path.basename(file),
            path: path.dirname(file),
        };

        this._filePaths.push(file);
        this._dtsList.push(fileObject);
    }

    /**
     * Adds multiple files to the worker object.
     *
     * @param filePaths
     *   One or more strings with the paths to be added.
     */
    public addFiles(... filePaths: string[]) {

        for (const filePath of filePaths) {
            this.addFile(filePath);
        }
    }

    /**
     * Adds a single file to the worker object.
     *
     * @param filePath
     *   String with the path to the file to be added.
     */
    public addFile(filePath: string) {

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
     *   A function callback to be used when the files matching the pattern are finished being
     *   added; this function may accept a parameter with the list of files added.
     * @param patterns
     *   One or more string with glob patterns containing files to be added.
     */
    public addGlobPatterns(callback: (files: string[]) => void, ... patterns: string[]) {

        const files: string[] = [];
        const ignored = `**/*.${this._context.options.extensionPrefix}.*`;
        const workingDir = process.cwd();

        const realCallback = (fileList: string[]) => {
            this.addFiles.apply(this, fileList);
            callback(fileList);
        };

        for (const pattern of patterns) {
            glob(
                pattern,
                {
                    ignore: ignored,
                    root: workingDir,
                },
                (error, matches) => {
                    if (error !== null) { throw error; }

                    files.push.apply(files, matches);

                    if (pattern === patterns[patterns.length - 1]) {
                        realCallback(files);
                    }
                },
            );
        }
    }

    /**
     * Adds all files that matches the given glob patterns, synchronously.
     *
     * @param patterns
     *   One or more string with glob patterns containing files to be added.
     * @return
     *   An array with the files added to the work queue.
     */
    public addGlobPatternsSync(... patterns: string[]) {

        const fileList: string[] = [];
        const ignored = `**/*.${this._context.options.extensionPrefix}.*`;
        const workingDir = process.cwd();

        for (const pattern of patterns) {
            const files = glob.sync(
                pattern,
                {
                    ignore: ignored,
                    root: workingDir,
                },
            );

            fileList.push.apply(fileList, files);
            this.addFiles.apply(this, files);
        }

        return fileList;
    }

    /**
     * Adds a javascript (.js) file to the file worker object.
     *
     * @param file
     *   Path to file or file object to be added.
     */
    public addJs(file: string) {

        if (!fs.existsSync(file)) {
            this._context.log(`File '${file}' does not exist. Skipping`, LogLevel.Warning);
            return;
        }

        if (path.extname(file).toLowerCase() !== ".js") {
            this._context.log(`File '${file}' extension is not js`, LogLevel.Warning);
            return;
        }

        const cwd = process.cwd();
        file = path.relative(cwd, file);

        if (this._filePaths.indexOf(file) > -1) {
            this._context.log(`File '${file}' is already being processed`, LogLevel.Information);
            return;
        }

        const fileObject = {
            contents: fs.readFileSync(file).toString(),
            name: path.basename(file),
            path: path.dirname(file),
        };

        this._filePaths.push(file);
        this._jsList.push(fileObject);
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
                this._dtsList = [];
                this._filePaths = [];
                this._jsList = [];

                this._mergedFiles = files;
                callback(files);
            },
        );
    }

    /**
     * Performs the processing of all the files in the file worker queue, and retrieves the
     * resulting files synchronously.
     */
    public workSync() {

        const files: File[] = [];

        this._timer = new Timer();
        this._timer.start();

        for (const dtsFile of this._dtsList) {
            const dtsProcessor = new DtsProcessor(this._read(dtsFile), this._context);
            const dtsResult = dtsProcessor.merge();

            if (dtsResult !== null) {
                files.push(dtsResult);
            }
        }

        for (const jsFile of this._jsList) {
            const jsProcessor = new JsProcessor(this._read(jsFile), this._context);
            const jsResult = jsProcessor.merge();

            if (jsResult !== null) {
                files.push(jsResult);
            }

            if (jsProcessor.sourceMapFile !== null) {
                files.push(jsProcessor.sourceMapFile);
            }
        }

        this._timer.end();

        this._dtsList = [];
        this._jsList = [];
        this._mergedFiles = files;
        return files;
    }

    /**
     * Writes the given file list to the disk.
     *
     * @param files
     *   A string or array of string with the files to be writen.
     */
    public write(files?: File | File[]) {

        files = files || this._mergedFiles;

        if (!(files instanceof Array)) {
            files = [files];
        }

        for (const file of files) {

            if (!file.name) {
                this._skipped.push(file);
                continue;
            }

            const basePath = this._context.options.outDir || file.path;
            const filePath = basePath + "/" + file.name;

            if (file.source && file.source.contents.length > 0) {
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
        this._timer.start();

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

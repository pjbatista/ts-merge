import gutil = require("gulp-util");

import {GenerateOptions} from "escodegen";
import {ParseOptions} from "esprima";
import {Statement} from "estree";

const generateOptions: GenerateOptions = {
    comment: true,
    format: {
        indent: { adjustMultilineComment: true },
    },
};

const mergeOptions: MergeOptions = {
    logger: "none",
    skipDeclarations: false,
    skipScripts: false,
    sourceMaps: true,
};

const parseOptions: ParseOptions = {
    comment: true,
    loc: true,
    range: true,
    tokens: true,
};

const consoleLogger = ((message: string, level: LogLevel = LogLevel.Information) => {

    let color = gutil.colors.reset;
    let expose = true;

    switch (level) {
        case LogLevel.Error:
            color = gutil.colors.red;
            break;
        case LogLevel.Warning:
            color = gutil.colors.yellow;
            break;
        default:
            expose = false;
            break;
    }

    const levelLog = expose ? color(LogLevel[level]) + ": " : "";
    gutil.log(levelLog + message);

}) as LoggerFunction;

const noneLogger: LoggerFunction = (message: string) => { message = ""; };

/**
 * Extends a default options object with new values.
 *
 * @param type
 *   "generate" (for escodegen GenerateOptions), "merge" (for ts-merge MergeOptions), "parse" (for
 *   esprima ParseOptions).
 * @param options
 *   An object with the options to be added to the default (it will replace any default value).
 * @typeparam T
 *   Type of options object used to extend its default.
 * @return
 *   The extended object instance.
 */
export function extendOptions<T extends GenerateOptions | MergeOptions | ParseOptions>(
    type: "generate" | "merge" | "parse",
    options?: T,
) {

    let result: T;

    switch (type) {
        case "generate":
            result = generateOptions as any;
            break;
        case "merge":
            result = mergeOptions as any;
            break;
        case "parse":
            result = parseOptions as any;
            break;

        default:
            throw new gutil.PluginError("ts-merge", `Invalid options type: '${type}'.`);
    }

    options = options || {} as any;

    // "Cloning" the selected object
    result = Object.assign({}, result);

    // Overwriting and sending final object
    return Object.assign(result, options) as T;
}

/**
 * Represents a declaration of a namespace in a d.ts file.
 */
export interface Declaration {

    /** Declaration body, contains all exported members of the namespace. */
    body?: string;

    /** Index within the documnet where the declaration ends. */
    endIndex?: number;

    /** Declaration namespace name. */
    name: string;

    /** Index within the documnet where the declaration starts. */
    startIndex: number;
}

/**
 * Represents a storage object whose indices are strings.
 *
 * This interface can be used with regular JavaScript objects, to represent their native property
 * dynamic acessor:
 *
 * ```javascript
 * var dictionary = {};
 * dictionary["my-index"] = 1;
 * ```
 *
 * @typeparam TOut
 *   Type of object stored by the dictionary.
 */
export interface Dictionary<TOut> {

    /** Dictionary / native object string indexer. */
    [index: string]: TOut;
}

/**
 * Represents a input file, with its data and metadata.
 */
export interface File {

    /** Contents of the file. */
    contents: string;

    /** Name of the file (with extension, without path). */
    name: string;

    /** Path to the file's directory (without file name). */
    path: string;

    /** Size of the file contents, in bytes. */
    size?: number;

    /** Object that represents the source from which this file was transpiled. */
    source?: File;
}

/**
 * Represents the callback function used as a logger for ts-merge.
 */
export type LoggerFunction = (message: string, level?: LogLevel, newLine?: boolean) => void;

/**
 * Enumerator with the log levels available.
 */
export enum LogLevel {
    Verbose = 0,
    Information = 1,
    Warning = 2,
    Error = 3,
    Success = 4,
}

/**
 * Describes the encapsulation of body that can merged throughout the processing.
 */
export interface MergeableBody {

    /** Body objects that are encapsulated by the object. */
    body: Statement[];

    /** Name of the module or body part. */
    name: string;
}

/**
 * Represents the context object used throughout a merge operation.
 *
 * It contains central references to the merging such as the options used for merging, the error
 * list, and the logger function.
 */
export class MergeContext {

    private _errors: Error[] = [];
    private _logger: LoggerFunction;
    private _options: MergeOptions;

    /**
     * Gets the current error list of the context.
     */
    public get errors() { return this._errors; }

    /**
     * Gets whether this context object has any errors or not.
     */
    public get hasErrors() { return this._errors.length > 0; }

    /**
     * Gets the logger function being used to display or save logs for this object.
     */
    public get logger() { return this._logger; }

    /**
     * Gets the options object set to this context.
     */
    public get options() { return this._options; }

    /**
     * Initializes a new instance of the {@link MergeContext} class, optionally setting the
     * environment options.
     *
     * @param options
     *   Options object used throughout the merging of files.
     */
    public constructor(options?: MergeOptions) {

        options = options || mergeOptions;
        this._options = options;

        if (options.logger === "none") {
            this._logger = noneLogger;
        }

        if (options.logger === "console") {
            this._logger = consoleLogger;
        }

        if (typeof(options.logger) === "function") {
            this._logger = options.logger;
        }
    }

    /**
     * Logs a new error, creating a gulp-util/PluginError object in case a string is given. This
     * error is also stored on the {@link errors} property.
     *
     * @param error
     *   Either a string with the error message or an Error object.
     * @return
     *   The error object, regardless if it was given by parameter or created by the method.
     */
    public error(error: string | Error) {

        if (typeof(error) === "string") {
            error = new gutil.PluginError("ts-merge", error);
        }

        this._errors.push(error);
        this.log(error.message, LogLevel.Error);

        return error;
    }

    /**
     * Inserts a new log entry.
     *
     * @param message
     *   Message to be added to the log.
     * @param level
     *   Level of the log detail, from log to error.
     * @param newLine
     *   Whether to insert a new line on loggers that accept so.
     */
    public log(message: string, level: LogLevel = LogLevel.Information, newLine: boolean = true) {

        this._logger(message, level, newLine);
    }
}

/**
 * Represents the object that contains the options that adjust the execution of the typescript-merge
 * post-processor.
 */
export interface MergeOptions {

    /**
     * Specifies the `escodegen` generate options object.
     */
    escodegenOptions?: GenerateOptions;

    /**
     * Specifies the `esprima` parse options object.
     */
    esprimaOptions?: ParseOptions;

    /**
     * Specifies the logger output (none, console, or callback).
     */
    logger?: "none" | "console" | "callback" | LoggerFunction;

    /**
     * Whether to skip the merging of declaration (.d.ts files) 'namespaces' or not.
     */
    skipDeclarations?: boolean;

    /**
     * Whether to skip the merging of script (.js files) 'namespaces' or not.
     */
    skipScripts?: boolean;

    /**
     * Whether to fix sourcemaps (.js.map files) or not (**experimental**).
     */
    sourceMaps?: boolean;
}

/**
 * Represents a generic processor object, which reads and merges a file based on its definition.
 */
export declare class MergeProcessor {

    /**
     * Constructor for the processor object.
     *
     * @param file
     *   A string with the file contents or a {@link File} object.
     * @param context
     *   Context object used to do the processing. If not given, implementations should create their
     *   own.
     */
    constructor(file: File | string, context?: MergeContext);

    /**
     * Merges the namespaces of the current file.
     *
     * @return
     *   A promise that when sucessful will retrieve the merged data as a string.
     */
    public merge(): Promise<File>;
}

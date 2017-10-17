import ts = require("typescript");
import yargs = require("yargs");

import {FileWorker} from "./file-worker";
import {LogLevel, MergeContext, MergeOptions} from "./utils";

/**
 * Represents the application behind the command-line interface; this object parses and routes
 * console/terminal commands and routes it to the module.
 *
 * Usage:
 *
 * ```plain
 * ts-merge pattern0 [pattern1 ... patternN] [options]
 * pattern0...patternN: glob patterns with the files to be merged
 * [options]: change the behavior of ts-merge:
 *   --help             | -H                 Displays this usage message
 *   --extensionPrefix  | -E (merged)        Sets extension prefix for output files
 *   --outDir           | -O (empty)         Sets the output directory
 *   --logger           | -L (console)|none  Sets the logger type
 *   --skipDeclarations | -D                 Do not parse .d.ts files
 *   --skipScripts      | -S                 Do not parse .js files
 *   --skipSourceMaps   | -M                 Prevents generation of .map files
 *   --version          | -V                 Shows ts-merge version
 * ```
 */
export class CliApplication {

    private _context: MergeContext;
    private _done: boolean;
    private _fileWorker: FileWorker;
    private _input: string[];
    private _options: MergeOptions;

    /**
     * Initializes a new instance of the {@link CliApplication} class, parsing the options, creating
     * the context and running the merger.
     */
    public constructor() {

        this._done = false;
        this._options = this._parseOptions(yargs.argv);
        this._input = yargs.argv._;

        if (!!(yargs.argv.version || yargs.argv.V)) {
            this._version();
            return;
        }

        if (yargs.argv.help || yargs.argv.H || this._input.length === 0) {
            this._help();
            return;
        }

        this._context = new MergeContext(this._options);
        this._fileWorker = new FileWorker(this._context);

        this._run();
    }

    // Shows usage help message
    private _help() {

        this._version();

        /*tslint:disable:max-line-length*/
        ts.sys.write("Usage: ts-merge pattern0 [pattern1 ... patternN] [options]\n\n");
        ts.sys.write("pattern0...patternN: glob patterns with the files to be merged\n\n");
        ts.sys.write("[options]: change the behavior of ts-merge:\n");
        ts.sys.write("  --help             | -H                 Displays this usage message\n");
        ts.sys.write("  --extensionPrefix  | -E (merged)        Sets extension prefix for output files\n");
        ts.sys.write("  --outDir           | -O (empty)         Sets the output directory\n");
        ts.sys.write("  --logger           | -L (console)|none  Sets the logger type\n");
        ts.sys.write("  --skipDeclarations | -D                 Do not parse .d.ts files\n");
        ts.sys.write("  --skipScripts      | -S                 Do not parse .js files\n");
        ts.sys.write("  --skipSourceMaps   | -M                 Prevents generation of .map files\n");
        ts.sys.write("  --version          | -V                 Shows ts-merge version\n");
        /*tslint:enable:max-line-length*/
    }

    // Parses options given through command-line
    private _parseOptions(args: yargs.Arguments) {

        const options: MergeOptions = {};

        const ext = args.extensionPrefix || args.E;
        options.extensionPrefix = typeof(ext) === "string" ? ext : "merged";

        const logger = args.logger || args.L;
        options.logger = logger || "console";

        options.outDir = args.outDir || args.O;
        options.skipDeclarations = !!(args.skipDeclarations || args.D);
        options.skipScripts = !!(args.skipScripts || args.S);
        options.skipSourceMaps = !!(args.skipSourceMaps || args.M);

        return options;
    }

    // Runs the CLI application file worker
    private _run() {

        this._fileWorker.addGlobPatternsSync.apply(this._fileWorker, this._input);
        this._fileWorker.workSync();
        this._fileWorker.write();

        const time = this._fileWorker.timer.result.toString();
        this._context.log(`Files processed in ${time}`);

        const skipped = this._fileWorker.unsaved.length;

        if (skipped === 0) {
            return;
        }

        this._context.log(`${skipped} files not written due to unknown file name`,
            LogLevel.Verbose);
    }

    // Shows app version
    private _version() {

        const pkg = require("../package.json");
        ts.sys.write(`\nTypeScript Merger (ts-merge) Version ${pkg.version}\n`);
    }
}

import ts = require("typescript");
import yargs = require("yargs");

import {FileWorker} from "./file-worker";
import {LogLevel, MergeContext, MergeOptions} from "./utils";

/**
 * Represents the application behind the command-line interface.
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

        if (yargs.argv.help || this._input.length === 0) {
            this._help();
            return;
        }

        this._context = new MergeContext(this._options);
        this._fileWorker = new FileWorker(this._context);

        this._run();
    }

    // Shows usage help message
    private _help() {

        ts.sys.write("Usage: ts-merge pattern0 [pattern1 ... patternN] [options]\n\n");
        ts.sys.write("pattern0...patternN: glob patterns with the files to be merged\n\n");
        ts.sys.write("[options]: change the behavior of ts-merge:\n");
        ts.sys.write("  --help                          Displays this usage message\n");
        ts.sys.write("  --extensionPrefix (merged)      Sets extension prefix for output files\n");
        ts.sys.write("  --logger none|(console)|file    Sets the logger type\n");
        ts.sys.write("  --skipDeclarations | -D         Do not parse .d.ts files\n");
        ts.sys.write("  --skipScripts      | -S         Do not parse .js files\n");
        ts.sys.write("  --skipSourceMaps   | -M         Prevents generation of .map files\n");
    }

    // Parses options given through command-line
    private _parseOptions(args: yargs.Arguments) {

        const options: MergeOptions = {};

        const ext = typeof(args.extensionPrefix) === "string" ? args.extensionPrefix : undefined;
        options.extensionPrefix = typeof(ext) === "string" ? ext : "merged";

        const logger = typeof(args.logger) === "string" ? args.logger : undefined;
        options.logger = logger || "console";

        options.skipDeclarations = !!(args.skipDeclarations || args.D);
        options.skipScripts = !!(args.skipScripts || args.S);
        options.skipSourceMaps = !!(args.skipSourceMaps || args.M);

        return options;
    }

    // Runs the CLI application file worker
    private _run() {

        this._fileWorker.addGlobPatterns(() => {

            this._fileWorker.work(files => {
                this._fileWorker.write(files);

                const time = this._fileWorker.timer.toString();
                this._context.log(`Files processed in ${time}`);

                const skipped = this._fileWorker.unsaved.length;

                if (skipped === 0) {
                    return;
                }

                this._context.log(`Skipped ${skipped} files due to unknown file name`,
                    LogLevel.Verbose);
            });
        }, this._input);
    }

    // Shows app version
    private _version() {

        const pkg = require("../package.json");
        ts.sys.write(`\nTypeScript Merger (ts-merge) Version ${pkg.version}\n`);
    }
}

import ts = require("typescript");
import yargs = require("yargs");

import {FileWorker} from "./file-worker";
import {MergeContext, MergeOptions} from "./utils";

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
     * Initializes a new instance of the {@link CliApplication} class.
     */
    public constructor() {

        this._done = false;
        this._options = this._parseOptions(yargs.argv);
        this._context = new MergeContext(this._options);

        this._fileWorker = new FileWorker(this._context);
        this._input = yargs.argv._;

        if (yargs.argv.help || this._input.length === 0) {
            this._help();
            return;
        }

        this._run();
    }

    // Shows usage help message
    private _help() {

        ts.sys.write("Usage: ts-merge [options] pattern0 pattern1 ... patternN\n");
        ts.sys.write("\n");
        ts.sys.write("[options]: change the behavior of ts-merge:\n");
        ts.sys.write("  --help                          Displays this usage message\n");
        ts.sys.write("  --logger none|(console)|file    Sets the logger type\n");
        ts.sys.write("  --skipDeclarations              Do not parse d.ts files\n");
        ts.sys.write("  --skipScripts                   Do not parse .js files\n");
        ts.sys.write("  --sourceMaps (true)|false       Controls generation of .map files\n");
    }

    // Parses options given through command-line
    private _parseOptions(args: yargs.Arguments) {

        const options: MergeOptions = {};

        options.logger = args.logger || "console";
        options.skipDeclarations = !!(args.skipDeclarations || args.D);
        options.skipScripts = !!(args.skipScripts || args.S);

        const sourceMaps = args.sourceMaps || args.M;
        options.sourceMaps = typeof(sourceMaps) === "undefined" ? true : sourceMaps;

        return options;
    }

    // Runs the CLI application file worker
    private _run() {

        this._fileWorker.addGlobPatterns(() => {

            this._fileWorker.workAndSave(() => {
                this._context.log("All files processed.");
            });
        }, this._input);
    }
}

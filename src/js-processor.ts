import codegen = require("escodegen");
import esprima = require("esprima");

import {ModuleDeclaration, Program, Statement} from "estree";
import {extendOptions, File, LogLevel, MergeableBody, MergeContext, MergeProcessor} from "./utils";

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

    /**
     * Merges the input javascript file of this object, returning an asynchronous promise with the
     * resulting data as an object.
     *
     * @return
     *   A promise containing the {@link File} result of the merging, on success.
     */
    public async merge() {

        const filePath = this._file.path + "/" + this._file.name;
        this._log(`Initializing merging of file '${filePath}'`);

        const parseOptions = extendOptions("parse") as any;
        parseOptions.raw = true;

        let ast = esprima.parseScript(this._file.contents, parseOptions);

        ast = codegen.attachComments(ast, ast.comments, (ast as any).tokens);
        const mergeCount = this._optimizeScript(ast.body);
        this._log(`Total block merges for '${filePath}': ${mergeCount}`);

        return await this._createFile(ast);
    }

    // Creates a file from the abstract tree program
    private _createFile(ast: Program): File {

        // const sourceMap = !!this._context.options.sourceMaps;

        const filePath = this._file.path + "/" + this._file.name;
        let sourcePath = filePath;

        if (this._file.source) {
            sourcePath = this._file.source.path + "/" + this._file.source.name;
        }

        const generateOptions = extendOptions("generate", {
            file: filePath,
            // sourceContent: sourceMap ? sourcePath : undefined,
        });

        return {
            contents: codegen.generate(ast, generateOptions),
            name: this._file.name.replace(".js", ".merged.js"),
            path: this._file.path,
            source: this._file.source,
        };
    }

    // Gets either a string with the module name or null if the node script is not a module
    private _getNodeName(node: ModuleDeclaration | Statement): string | null {

        if (node.type !== "VariableDeclaration" || node.declarations.length !== 1) {
            return null;
        }

        const declaration = node.declarations[0];

        if (declaration.type !== "VariableDeclarator" || declaration.init !== null) {
            return null;
        }

        return (declaration.id as any).name;
    }

    // Gets either a statement array or null if the node script is not mergeable
    private _getNodeBody(name: string | null, node: ModuleDeclaration | Statement) {

        if (node.type !== "ExpressionStatement") {
            return null;
        }

        const expression = node.expression;

        if (expression.type !== "CallExpression") {
            return null;
        }

        const callee = expression.callee;

        if (
            callee.type !== "FunctionExpression" ||
            callee.id !== null ||
            callee.params.length !== 1 ||
            (callee.params[0] as any).name !== name
        ) {
            return null;
        }

        const args = expression.arguments;

        if (
            args.length !== 1 ||
            args[0].type !== "LogicalExpression" &&
            args[0].type !== "AssignmentExpression" ||
            (args[0] as any).left.name.indexOf(name) === -1
        ) {
            return null;
        }

        return callee.body.body;
    }

    // Context log shortcut method
    private _log(message: string, level: LogLevel = LogLevel.Information) {
        this._context.log(message, level);
    }

    // Merges the given body statements, returning the updated number of merged blocks
    private _mergeBodies(
        bodies: MergeableBody[],
        nodes: Array<ModuleDeclaration | Statement>,
        nesting: number,
        mergeCount: number,
    ) {
        const result = bodies[0].body;
        mergeCount += bodies.length - 1;

        // Merging module bodies entails appending all the contained expressions to the list of
        // expressions of the first body, and then removing the original definition.

        for (let index = 1; index < bodies.length; index += 1) {
            result.push.apply(result, bodies[index].body);
            nodes.splice(nodes.indexOf(bodies[index].name as any), 2);
        }

        // After all bodies have been merged, recurse into the newly-unified module body to merge
        // all child module definitions.

        return this._optimizeScript(result, nesting + 1, mergeCount);
    }

    // Optimizes the script according to the current node selection, nesting and merge count
    private _optimizeScript(
        nodes: Array<ModuleDeclaration | Statement>,
        nesting: number = 0,
        mergeCount: number = 0,
    ) {
        let bodies: MergeableBody[] = [];
        let blockName: string | null = null;

        for (let index = 0; index < nodes.length - 1; index += 1) {

            const name = this._getNodeName(nodes[index]);
            const moduleScript = this._getNodeBody(name, nodes[index + 1]);

            // The node does not contain a module declaration, so we merge all the currently
            // collected bodies for the last module name, if any. This is required because any other
            // expression might rely on the module definitions before it, and following module
            // definitions might rely on whatever that expression did.

            if (!name || !moduleScript) {

                if (bodies.length) {
                    mergeCount = this._mergeBodies(bodies, nodes, nesting, mergeCount);
                    index -= bodies.length * 2 - 2;
                    blockName = null;
                    bodies = [];
                }

                continue;
            }

            // A new module definition has been reached. Merge all bodies for the previous name, if
            // any, and start a new list.

            if (name !== blockName) {

                if (bodies.length) {
                    mergeCount = this._mergeBodies(bodies, nodes, nesting, mergeCount);
                    index -= bodies.length * 2 - 2;
                }

                blockName = name;
                bodies = [];
                this._log(`IIFE block '${name}' found at statement ${index}`, LogLevel.Verbose);
            }

            bodies.push({
                body: moduleScript as Statement[],
                name: nodes[index] as any,
            });

            index += 1;
        }

        // Last step: merge all bodies for the last encountered module name, if any.

        if (bodies.length) {
            mergeCount = this._mergeBodies(bodies, nodes, nesting, mergeCount);
        }

        return mergeCount;
    }
}

import convert = require("convert-source-map");
import codegen = require("escodegen");
import esprima = require("esprima");

import {ModuleDeclaration, Program, Statement} from "estree";
import {RawSourceMap} from "source-map";
import {extendOptions, File, LogLevel, MergeableBody, MergeContext, MergeProcessor} from "./utils";

const sourceMapCommentRegex = /(\/\/# sourceMappingURL=.*)$/m;

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
    private _originalSourceMap: convert.SourceMapConverter | null;
    private _originalSourceMapStyle: "url" | "inline" | "none";
    private _sourceMapFile: File | null;

    /** Gets the source map file generated by the merging. */
    public get sourceMapFile() { return this._sourceMapFile; }

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
                path: process.cwd(),
                size: file.toString().length,
            };
        }

        this._context = context || new MergeContext();
        this._file = file;
        this._originalSourceMap = null;
        this._originalSourceMapStyle = "none";
        this._sourceMapFile = null;
    }

    /**
     * Merges the input JavaScript file of this object, returning the merged file as result.
     *
     * @return
     *   A file object, containing the results of the merging and all attributes pertaining to it.
     */
    public merge() {

        const filePath = this._file.path + "/" + this._file.name;
        this._log(`Initializing merging of file '${filePath}'`);

        if (!this._context.options.skipSourceMaps) {
            this._parseOriginalSourceMap();
        }

        let parseOptions = extendOptions("parse") as any;

        if (this._context.options.parseOptions) {
            parseOptions = Object.assign(this._context.options.parseOptions, parseOptions);
        }

        parseOptions.raw = true;

        let ast = esprima.parseScript(this._file.contents, parseOptions);

        ast = codegen.attachComments(ast, ast.comments, (ast as any).tokens);
        const mergeCount = this._optimizeScript(ast.body);
        this._log(`Total block merges for '${filePath}': ${mergeCount}`);

        return this._createFile(ast, mergeCount);
    }

    // Creates a file from the abstract tree program
    private _createFile(ast: Program, merges: number): File {

        // Creating extension string and merging consecutive dots

        let extension = `.${this._context.options.extensionPrefix}.js`;
        extension = extension.replace("..", ".");

        const filePath = this._file.path + "/" + this._file.name;
        const newName = this._file.name.replace(".js", extension);
        const sourceMap = !this._context.options.skipSourceMaps;

        // First we obtain a default GenerateOptions objects with our file

        let options = extendOptions("generate", { file: filePath }) as codegen.GenerateOptions;

        // Then, we override with the "generateOptions" of the context

        if (this._context.options.generateOptions) {
            options = Object.assign(this._context.options.generateOptions, options);
        }

        if (sourceMap) {
            options.sourceMap = newName;
            options.sourceMapWithCode = true;
        }

        let codegenData: any = codegen.generate(ast, options);

        // When generating source-maps, the JS processor needs to create an additional .map file,
        // which is placed at the sourceMapFile property. FileWorker already sends this file to its
        // working queue automatically

        if (sourceMap) {

            const newSourceMap = newName + ".map";
            this._fixSourceMap(newSourceMap, codegenData, newName, merges === 0);

            if (this._originalSourceMapStyle === "url") {

                this._sourceMapFile = {
                    contents: codegenData.map.toString(),
                    name: newSourceMap,
                    path: this._file.path,
                    source: this._file.source,
                };
            }

            codegenData = codegenData.code;
        }

        return {
            contents: codegenData,
            name: newName,
            path: this._file.path,
            source: this._file.source,
        };
    }

    // Adjusts the source-map reference of the output file
    private _fixSourceMap(
        file: string,
        data: { code: string, map: any },
        newName: string,
        keepOriginalData: boolean,
    ) {

        if (this._originalSourceMapStyle === "none") {
            return;
        }

        const newMap = convert.fromObject(data.map);
        const originalMap: any = this._originalSourceMap;

        const parsedMap: RawSourceMap = newMap.toObject();
        parsedMap.file = newName;
        parsedMap.names = originalMap.sourcemap.names || [""];
        parsedMap.sourceRoot = originalMap.sourcemap.sourceRoot || "";
        parsedMap.sources = originalMap.sourcemap.sources || [""];
        parsedMap.sourcesContent = originalMap.sourcemap.sourcesContent || [""];

        if (keepOriginalData) {
            parsedMap.mappings = originalMap.toObject().mappings;
        }

        if (parsedMap.sourcesContent && parsedMap.sourcesContent.length === 0) {
            delete parsedMap.sourcesContent;
        }

        data.map = JSON.stringify(parsedMap);

        // Removing original source-map comment from the string
        data.code = data.code.replace(sourceMapCommentRegex, "");

        const style = this._originalSourceMapStyle;

        if (style === "inline") {
            data.code += newMap.toComment();
            return;
        }

        if (style === "url") {
            data.code += "\n//# sourceMappingURL=" + file;
            return;
        }
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

    // Gets the original source map from the JS file to later be added to the merged JS
    private _parseOriginalSourceMap() {

        if (!sourceMapCommentRegex.test(this._file.contents)) {
            return;
        }

        // Checking if the original source-map comment is available

        const sourceMapComment = sourceMapCommentRegex.exec(this._file.contents);

        if (sourceMapComment === null) {
            return;
        }

        const parsedComment = sourceMapComment[1];

        // If the source map is embedded (inline), it will contain a JSON content-type identifier,
        // otherwise the source map is (most-definitely) a file URL

        if (parsedComment.indexOf("data:application/json;") > -1) {

            this._originalSourceMap = convert.fromComment(sourceMapComment[1]);
            this._originalSourceMapStyle = "inline";
            return;
        }

        this._originalSourceMap = convert.fromMapFileComment(sourceMapComment[1],
            this._file.path);
        this._originalSourceMapStyle = "url";
    }
}

import {Declaration, Dictionary, File, LogLevel, MergeContext, MergeProcessor} from "./utils";

const additionalName = "__additionalDeclaration";
const additionalRegex = /__additionalDeclaration[0-9]+/i;
const threshold = 3;

// Groups: 1 - indentation, 2 - type, 3 - name
const declarationRegex = /^(.*?)declare (namespace) (.*?){/gim;

function addToArrayDictionary<T, TDictionary extends Dictionary<T[]>>(
    target: TDictionary,
    index: string,
    element: T,
) {

    if (!target) {
        return;
    }

    if (!target.hasOwnProperty(index)) {
        target[index] = [];
    }

    target[index].push(element);
}

function getDictionaryLength<T>(dictionary: Dictionary<T>) {

    let result = 0;

    for (let entry in dictionary) {

        if (dictionary.hasOwnProperty(entry)) {
            entry = "";
            result += 1;
        }
    }

    return result;
}

function joinDeclarations(declarations: Declaration[], separator?: string) {

    let result = "";
    separator = separator || "";

    for (const declaration of declarations) {
        result += declaration.body + separator;
    }

    result = result.substr(0, result.length - separator.length);

    return result;
}

/**
 * Represents the processor for transpiled declaration (d.ts) files.
 *
 * It optimizes the namespace declaration, exporting all contents of a same namespace within a
 * single block.
 *
 * First, it will look for TypeScript declaration namespaces:
 *
 * ```typescript
 * namespace myModule {
 *     export declare class FromFile1 {}
 * }
 * namespace myModule {
 *     export declare interface FromFile2 {}
 * }
 * // ...
 * namespace myModule {
 *     export declare class FromFileN {}
 * }
 * ```
 * Then, using {@link merge} it will optmize all blocks with the same module name:
 *
 * ```typescript
 * namespace myModule {
 *     export declare class FromFile1 {}
 *     export declare interface FromFile2 {}
 *     // ...
 *     export declare class FromFileN {}
 * }
 * ```
 */
export class DtsProcessor implements MergeProcessor {

    private static _unnamedCount = 0;

    private _context: MergeContext;
    private _file: File;

    /**
     * Initializes a new instance of the {@link DeclarationProcessor} class, using the input file as
     * content source for the merging.
     *
     * @param file
     *   A string with the file contents or a {@link InputFile} object.
     * @param context
     *   Context object used throughout mergings.
     */
    public constructor(file: File | string, context?: MergeContext) {

        if (typeof(file) === "string") {
            DtsProcessor._unnamedCount += 1;
            const fileName = "unnamed" + DtsProcessor._unnamedCount.toString() + ".d.ts";

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
     * Merges the input declaration file of this object, returning an asynchronous promise with the
     * resulting data as an object.
     *
     * @return
     *   A promise containing the {@link File} result of the merging, on success.
     */
    public async merge() {

        const filePath = this._file.path + "/" + this._file.name;
        this._log(`Initializing merging of file '${filePath}'`);

        const declarations = this._getDeclarations();
        const organizedDeclarations = this._organizeDeclarations(declarations);

        const length1 = declarations.length;
        const length2 = getDictionaryLength(organizedDeclarations);
        this._log(`Total declaration merges for '${filePath}': ${length2} (from ${length1})`);

        return await this._mergeDeclarations(organizedDeclarations);
    }

    // Gets the declarations based on the constant regex, resulting in a linear array
    private _getDeclarations() {

        const data = this._file.contents;
        const result: Declaration[] = [];

        let lastIndex = 0;
        let previous: Declaration = undefined as any;
        let search: RegExpExecArray | null = null;

        while (search = declarationRegex.exec(data)) {

            if (previous) {

                const endIndex = search.index - 1;

                previous.body = data.substr(previous.startIndex, endIndex - previous.startIndex);
                previous.endIndex = endIndex;

                lastIndex = endIndex;
            }

            const current: Declaration = {
                name: search[3].trim(),
                startIndex: search.index,
            };

            result.push(current);
            previous = current;
        }

        // Adjusting the declarations from the last namespace to the end of the file

        if (previous) {
            const finalIndex = data.length - 1;
            previous.body = data.substr(previous.startIndex, finalIndex - previous.startIndex);
            previous.endIndex = finalIndex;
        }

        return result;
    }

    // Context log shortcut method
    private _log(message: string, level: LogLevel = LogLevel.Information) {
        this._context.log(message, level);
    }

    // Merges a previously organized declaration dictionary
    private _mergeDeclarations(declarations: Dictionary<Declaration[]>): File {

        let data = "";

        for (const declarationName in declarations) {

            if (declarations.hasOwnProperty(declarationName)) {

                if (additionalRegex.test(declarationName)) {
                    data += joinDeclarations(declarations[declarationName]);
                    continue;
                }

                data += `declare namespace ${declarationName} {\n\t`;
                data += joinDeclarations(declarations[declarationName], "\t");
                data += "}\n";
            }
        }

        return {
            contents: data,
            name: this._file.name.replace(".d.ts", ".merged.d.ts"),
            path: this._file.path,
            source: this._file.source,
        };
    }

    // Organizes a linear declaration array into a dictionary profile
    private _organizeDeclarations(declarations: Declaration[]) {

        const data = this._file.contents;
        let extraCount = 0;
        let previous: Declaration = undefined as any;
        const result: Dictionary<Declaration[]> = {};

        for (const declaration of declarations) {

            let body = declaration.body as string;
            const endOffset = body.length - body.lastIndexOf("}");

            // Replacing the declaration with an empty string to get its body only
            body = body.replace(declarationRegex, "");

            // Removing the last bracket
            const lastBracket = body.lastIndexOf("}");
            body = body.substr(0, lastBracket);

            declaration.body = body;
            declaration.endIndex = (declaration as any).endIndex - endOffset;

            // If the current declaration is further from the previous one than the threshold
            // allows, it contains more exports that need to be included

            if (previous && declaration.startIndex - (previous as any).endIndex >= threshold) {

                const start = (previous as any).endIndex + 1;
                const end = declaration.startIndex - 1;

                const extra: Declaration = {
                    body: this._file.contents.substr(start, end - start),
                    endIndex: end,
                    name: additionalName,
                    startIndex: start,
                };

                addToArrayDictionary(result, additionalName + extraCount++, extra);
            }

            previous = declaration;
            addToArrayDictionary(result, declaration.name, declaration);
        }

        // Finally, adding any remaining declarations at the end of the file

        if (!previous) {
            previous = {
                endIndex: -1,
                name: "",
                startIndex: 0,
            };
        }

        if (data.length - (previous as any).endIndex >= threshold) {

            const start = (previous as any).endIndex + 1;
            const end = data.length;

            const extra: Declaration = {
                body: data.substr(start, end - start),
                endIndex: end,
                name: additionalName,
                startIndex: start,
            };

            addToArrayDictionary(result, additionalName + extraCount++, extra);
        }

        return result;
    }
}
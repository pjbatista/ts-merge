import es = require("event-stream");
import gutil = require("gulp-util");

import {FileWorker} from "./file-worker";
import {MergeContext, MergeOptions} from "./utils";

function doWork(fileWorker: FileWorker) {

    return function(this: es.MapStream) {
        fileWorker.work(files => {

            for (const file of files) {

                const gulpFile = new gutil.File({
                    base: "",
                    contents: new Buffer(file.contents),
                    cwd: "",
                    path: file.name,
                });

                this.emit("data", gulpFile);
            }

            this.emit("end");
        });
    };
}

function parseFile(fileWorker: FileWorker) {

    return (file: gutil.File) => {
        fileWorker.addFile(file.path);
    };
}

/**
 * This is a function that wraps the TypeScript Merger functionality into Node.JS streams, and is
 * useful when the merging needs to be streamed in a pipeline.
 *
 * @example Using tsmerge with gulp
 *
 * ```javascript
 * // Both ways are correct to import the stream worker:
 * var tsmerge = require('ts-merge/stream');
 * var tsmerge = require('ts-merge').streamFunction;
 *
 * gulp.task('merge', function() {
 *   gulp
 *     .src(['*.ts', '*.d.ts'])
 *     .pipe(tsmerge({ extensionPrefix: 'compact' }))
 *     .pipe(gulp.dest('.'));
 * });
 * ```
 *
 * For more information, see {@link MergeOptions}.
 */
function streamFunction(options?: MergeOptions): NodeJS.ReadWriteStream {

    const context = new MergeContext(options);
    const fileWorker = new FileWorker(context);

    return (es as any).through(parseFile(fileWorker), doWork(fileWorker));
}

export = streamFunction;

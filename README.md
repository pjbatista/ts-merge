# ts-merge

> Merge definitions of transpiled namespaces, fixing code (.js), declarations (.d.ts) and sourcemaps (.js.map)

## About

This is a post-processor for [TypeScript](https://www.typescriptlang.org/), which allows the merging of [IIFE blocks](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) in transpiled code (.js) and duplicate namespaces in declaration files (.d.ts). It is also able to re-map sources (.map) in order to debug TypeScript from merged files.

ts-merge can be used via command-line, directly in code, or through stream pipelines (e.g. gulp) without the need for any additional plugins.

This plugin is based on and inspired by Till Schneidereit's [typescript-module-merger](https://github.com/tschneidereit/typescript-module-merger). All credits for the JS merging goes to him!

## Installation

`ts-merge` can be installed using the node package manager of your choice (npm, yarn):

### Local

Local installations allow it to be used on a per project basis:

`npm install ts-merge --save`

`yarn add ts-merge`

### Global

Global installations expose the **ts-merge** binary to the command-line, making it available, well, globally:

`npm install ts-merge -g`

`yarn global add ts-merge`

## Usage

Once installed, this package can be used in multiple ways: direct (importing and using in code), in streams (as a part of a node stream pipeline - like gulp), or in consoles/terminals as a CLI app.

### Direct

Using ts-merge in your code is pretty straight-forward. You can use a specific processor class in order to merge a single file or the FileWorker class (have to manually read the file) to do it with multiple files at once (no manual read required).

```javascript
var tsmerge = require("ts-merge");

var myData = fs.readFileSync("myfile.js");
var myProcessor = new tsmerge.JsProcessor(myData);
var mergedData = myProcessor.merge();

fs.writeFileSync("myfile.merged.js");
```

---

```javascript
var tsmerge = require("ts-merge");

// Creating a context in order to pass some options
var context = new tsmerge.MergeContext({
    extensionPrefix: "clean",
    logger: function(msg, level) {
        mylogger(msg, level);
    }
});

var fileWorker = new tsmerge.FileWorker(context);
fileWorker.addFile("myfile.js");
fileWorker.addFile("myfile.d.ts");
fileWorker.addFile("lib/plugin.js");

// Async merging and writing all files in worker
fileWorker.work(function (files) {
    fileWorker.write(files);

    // FileWorker has a nice Timer utility
    console.log(fileWorker.timer.toString()); // 315.041155 ms
    console.log(fileWorker.timer.totalNanoSeconds); // 315041155
});
```

### Streams

`ts-merge` requires no additional plugins to be streamlined and piped. All you need to do is to import the `streamFunction` from the global exports, or import the default member of `ts-merge/stream`.

```javascript
var tsmerge = require("ts-merge/stream");
// OR
var tsmerge = require("ts-merge").streamFunction;

gulp.task("merge", function () {

    return gulp.src("dist/**/*")
        .pipe(tsmerge({ sourceMaps: false }))
        .pipe(gulp.dest("."));
});
```

### Command-line interface application

The CLI app is available globally as `ts-merge` and locally at `node_modules/.bin/ts-merge`.

You can specify options using --[option-name] [option-value] modifiers.

```sh
ts-merge out/my.js --extensionPrefix "" --skipSourceMaps
# An empty extensionPrefix overwrites out/my.js
```

The app can also be used with multiple files.

```sh
ts-merge lib/vendor1/script1.js lib/vendor2/script2/* dist/my.js --logger none
# Setting logger to "none" prevents log printing
```

For more information, use --help

```sh
ts-merge --help
```

## Changelog

### Version 0.2.7

- Fixed double-dot ("..") extensions when `extensionPrefix` is empty;
- Fixes multiple file bindings using consecutive `streamFunction` calls;
- Added appropriate shortcuts when initializing Processors with `skip*` options;
- Improved unit testing (including tests for file naming and other options).

### Version 0.2.5 - 0.2.6

These version contain failing patches.
- <strike>Fixed double-dot ("..") extensions when `extensionPrefix` is empty.</strike>

### Version 0.2.4

Added `--version` option to the CLI app.

### Version 0.2.3

Fixed README typos and examples.

### Version 0.2.2

Removed unnecessary references to minimatch and source-map.

### Version 0.2.1

Removed unnecessary reference to gulp and gulpfile.js.

### Version 0.2.0

> First version with all features, documentation, and unit testing

- Added a better text to the README (aka this thing you're reading);
- Renamed the `sourceMaps` option to `skipSourceMaps`, and adjusted its behavior appropriately;
- All options are coded in context, cli, processors and workers;
- Added `ts-merge/stream` module with the default export `streamFunction`;
- Added missing type exports on index.

### Version 0.1.5

- FileWorker.workAndSave has been **deprecated**;
- FileWorker no longer exceeds Node.JS heap limit when dealing with multiple large files;

### Version 0.1.4

- Removed the necessity for `typescript-module-merger` as its functionality was fully embedded in ts-merge.

### Version 0.1.3 and older

Incomplete project commits. Mockups and initial NPM testing. Extremely unstable.

## Credits

Pedro Batista <pedrobatista@myself.com>

This plugin would not exist were it not for [TypeScript Module Merger, by Till Schneidereit](https://github.com/tschneidereit/typescript-module-merger).

## License

[Apache License 2.0](https://github.com/pjbatista/ts-merge/blob/master/LICENSE)

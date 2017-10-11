# ts-merge

> Merge definitions of transpiled TypeScript namespaces, fixing code (.js), declarations (.d.ts) and sourcemaps (.js.map)

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

Using ts-merge in your code is pretty straight-forward. You can use a specific processor class in order to merge a single file or use the FileWorker class merge multiple files at once.

```javascript
var tsmerge = require("ts-merge");

var worker = new tsmerge.FileWorker();
worker.addFile("myfile.js");

var mergedFiles = worker.workSync();
worker.write(mergedFiles);
```

---

```javascript
var tsmerge = require("ts-merge");

var dtsData = fs.readFileSync("myfile.d.ts");
var jsData = fs.readFileSync("myfile.js");

// Processors read data, not filenames
var dtsProcessor = new tsmerge.DtsProcessor(dtsData);
var jsProcessor = new tsmerge.JsProcessor(jsData);

dtsData = dtsProcessor.merge();
jsData = jsProcessor.merge();

// The following will overwrite the original files
fs.writeFileSync("myfile.d.ts", dtsData);
fs.writeFileSync("myfile.js", jsData);
```

---

```javascript
var tsmerge = require("ts-merge");

// Creating a MergeContext in order to pass some options
var context = new tsmerge.MergeContext({
    // Making myfile.* merge into myfile.clean.*:
    extensionPrefix: "clean",

    // Defining a custom logger
    logger: function(msg, level) {
        mylogger(msg, level);
    }
});

var fileWorker = new tsmerge.FileWorker(context);
fileWorker.addFile("myfile.js");
fileWorker.addFile("myfile.d.ts");
fileWorker.addFile("lib/plugin.js");

// Async merging...
fileWorker.work(function (files) {

    //...and then writing of the merged files
    fileWorker.write(files);

    // Output: myfile.clean.js, myfile.clean.d.ts, lib/plugin.clean.js
    // Also: *.clean.js.map if there are valid *.js.map files

    // FileWorker has a nice Timer utility
    console.log(fileWorker.timer.toString()); // 315.04 ms
    console.log(fileWorker.timer.totalNanoSeconds); // 315041155
});
```

### Streams (gulp)

`ts-merge` requires no additional plugins to be streamlined and piped. All you need to do is to import the `streamFunction` from the global exports.

```javascript

var tsmerge = require("ts-merge").streamFunction;

gulp.task("merge", function () {

    return gulp.src("dist/**/*")
        .pipe(tsmerge({ skipSourceMaps: true }))
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
# Setting logger to "none" prevents any sort of printing
```

For more information, use the --help option

```sh
ts-merge --help
```

## Changelog

See [CHANGES.md](https://github.com/pjbatista/ts-merge/blob/master/CHANGES.md)

## Credits

Pedro Batista <pedrobatista@myself.com>

This plugin would not exist were it not for [TypeScript Module Merger, by Till Schneidereit](https://github.com/tschneidereit/typescript-module-merger).

## License

[Apache License 2.0](https://github.com/pjbatista/ts-merge/blob/master/LICENSE)

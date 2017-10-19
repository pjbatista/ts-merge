# ts-merge CHANGELOG

## Version 0.4.2

- Updated a few `timecount` references;
- Changed `typedoc` theme to "minimal";
- Fixed typos and references in documentation.

## Version 0.4.1

Fixed binary due to lack of published "dist/".

## Version 0.4.0

- Unit testing overhaul:
  - Renamed all test case descriptions;
  - Added specific tests for "utils";
  - Added specific tests for "stream".
- `DtsProcessor` and `JsProcessor`:
  - Added support for `outDir`;
  - Post-processing file normalization.
- `FileWorker`:
  - Added constructor overrides (accepting options);
  - Added `fileCount`;
  - Fixed an import multi-callback leak from `addGlobPatterns`;
  - Created `addGlobPatternsSync` and moved internal usages to it;
- Added stream alias to streamFunction;
- Improved help text for exported members;
- Added documentation link to README;
- Removed `Timer` in favor of [timecount](https://github.com/pjbatista/timecount);
- Changed documentation index to the new file API.md.

---

## Version 0.3.0

- Documentation added to external page https://pjbatista.github.io/ts-merge/;
- Improved `FileWorker` unit testing;
- Fixed a @type incompatibility issues;
- Fixed problems with file sources being lost;
- Removed previously deprecated `workAndSave`;
- TypeDoc options moved to tsconfig;
- Packaging tasks moved to local binary dependency;
- Deprecated older versions.

---

## Version 0.2.10

- Moved some @types from dev-dependency to dependency to avoid TS7016 errors;
- Moved the changelog from the README to its own file - CHANGES.md;
- `DtsProcessor`:
  - Fixed additional lines on declarations;
  - Merged namespace count on logs;
  - Updated test file expected assets to reflect changes;
- Added a .npmignore file (excludes source and temp directories).

## Version 0.2.9

Fixed README examples and text.

## Version 0.2.8

Fixed a bug when calling `streamFunction` from gulp.

## Version 0.2.7

- Fixed double-dot ("..") extensions when `extensionPrefix` is empty;
- Fixes multiple file bindings using consecutive `streamFunction` calls;
- Added appropriate shortcuts when initializing Processors with `skip*` options;
- Improved unit testing (including tests for file naming and other options).

## Version 0.2.5 - 0.2.6

These version contain failing patches.
- <strike>Fixed double-dot ("..") extensions when `extensionPrefix` is empty.</strike>

## Version 0.2.4

Added `--version` option to the CLI app.

## Version 0.2.3

Fixed README typos and examples.

## Version 0.2.2

Removed unnecessary references to minimatch and source-map.

## Version 0.2.1

Removed unnecessary reference to gulp and gulpfile.js.

## Version 0.2.0

> First version with all features, documentation, and unit testing

- Added a better text to the README (aka this thing you're reading);
- Renamed the `sourceMaps` option to `skipSourceMaps`, and adjusted its behavior appropriately;
- All options are coded in context, cli, processors and workers;
- Added `ts-merge/stream` module with the default export `streamFunction`;
- Added missing type exports on index.

---

## Version 0.1.5

- FileWorker.workAndSave has been **deprecated**;
- FileWorker no longer exceeds Node.JS heap limit when dealing with multiple large files;

## Version 0.1.4

- Removed the necessity for `typescript-module-merger` as its functionality was fully embedded in ts-merge.

## Version 0.1.3 and older

Incomplete project commits. Mockups and initial NPM testing. Extremely unstable.

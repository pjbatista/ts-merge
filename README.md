# ts-merge

> Merge definitions of transpiled namespaces, fixing code (.js), declarations (.d.ts) and sourcemaps (.js.map)

#### BETA (still being developed / tested)

## About

This is a post-processor for [TypeScript](https://www.typescriptlang.org/), which allows the merging of both transpiled code [IIFE blocks](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) and duplicate namespaces in declaration files, and also re-maps the source for debugging (via [source-map](https://github.com/mozilla/source-map)).

It can be used through command-line, in stream pipelines (i.e. gulp), or directly in code, without the need for any additional plugins.

It is based of and inspired by Till Schneidereit's [typescript-module-merger](https://github.com/tschneidereit/typescript-module-merger).

## Installation

It can be installed using the node package manager of your choice (npm, yarn).


**IMPORTANT**: This version is still being heavily tested and it's usage is still NOT RECOMMENDED. Give me a week and everything should be fine, including usage, help and documentation.
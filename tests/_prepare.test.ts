// This file prepares the environment to run the tests

import fs = require("fs");
import path = require("path");

const directory = "tests/temp";

fs.readdir(directory, (error, files) => {

    if (error) { throw error; }

    for (const file of files) {
        fs.unlink(path.join(directory, file), error2 => {
            if (error2) { throw error2; }
        });
    }
});

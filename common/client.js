/*
Client service for periodic casync updates
*/

const { loadJSON, saveJSON } = require("./json.js");
const fs = require('fs');

// Load config and make casync archive
if (process.argv.length > 2) {
    // Load the configuration file passed as an argument
    loadJSON(process.argv[2]).then(config => {

    }).catch(err => {
        console.error(err);
    });
}

/**
 * Parse a configuration object, and schedule updaters
 * @param {object} config 
 */
function parseConfig(config) {
    if (config.isArray()) {
        config.forEach(c => {
            // Check for valid configuration entry
            if (c.interval && c.index && c.destination) {

            }
        });
    }
    else {
        throw Error('Invalid configuration file');
    }
}

/**
 * Check if a directory exists
 * @param {string} path 
 * @returns - true if the directory exists
 */
function dirExists(path) {
    let p = path;
    if (!p.endsWith('/')) { p += '/' }

    return fs.existsSync(p);
}

/**
 * Determine whether the given `path` points to an empty directory.
 * @param {string} path 
 * @returns {Boolean}
 */
async function isEmptyDir(path) {
    // Code from https://futurestud.io/tutorials/node-js-check-if-a-directory-is-empty
    try {
        const directory = fs.opendir(path);
        const entry = await directory.read();
        await directory.close();

        return entry === null;
    } catch (error) {
        return false;
    }
}

/**
 * Makes a backup of a local directory to a casync destination
 * @param {string} index - destination casync index file path
 * @param {string} source - Source directory path
 * @param {object} casync - casync instance 
 * @returns Promise with boolean indicating the result of the operation
 */
function makeBackup(index, source, casync) {
    return new Promise((resolve, reject) => {
        // Check for valid index and source
        let dstDir = path.dirname(index);
        if (dirExists(source) && !isEmptyDir(source) && dirExists(dstDir)) {
            casync.make(index, source).then(data => {
                if (data && data.stderr === '') {
                    resolve(true);
                }
                else {
                    let errMsg = '';
                    if (data && data.stderr) {
                        reject(`Unable to save backup: ${index} ` + data.stderr.trim());
                    }
                    else {
                        reject(`Unable to save backup: ${index}`);
                    }
                }
            });
        }
        else {
            resolve(false);
        }
    });
}

function extractBackup(index, destination, casync) {
    return new Promise((resolve, reject) => {
        // Check for valid data and valid destination
        if (dirExists(destination) && fs.existsSync(index)) {
            casync.extract(index, destination).then(data => {
                if (data && data.stderr === '' && data.stdout) {
                    // Resolve the checksum
                    resolve(data.stdout.trim());
                }
                else {
                    let errMsg = '';
                    if (data && data.stderr) {
                        reject(`Unable to extract backup: ${index} ` + data.stderr.trim());
                    }
                    else {
                        reject(`Unable to extract backup: ${index}`);
                    }
                }
            });
        }
        else {
            resolve(false);
        }
    });
}
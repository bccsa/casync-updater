/*
Client service for periodic casync updates
*/

const { loadJSON, saveJSON } = require("./json.js");
const fs = require('fs');
const path = require('path');
const { casync } = require('./casync.js');

/**
 * Checksum cache
 */
var checksum = {};

// Load config and make casync archive
if (process.argv.length > 2) {
    // Load the configuration file passed as an argument
    loadJSON(process.argv[2]).then(config => {
        parseConfig(config);
    }).catch(err => {
        console.error(`Error in ${process.argv[2]}: ${err}`);
    });
}

/**
 * Parse a configuration object, and schedule updaters
 * @param {object} config 
 */
function parseConfig(config) {
    if (Array.isArray(config)) {
        config.forEach(async c => {
            // Check for valid configuration entry
            if (c.interval && c.index && c.store && c.destination) {
                // Create a new casync wrapper instance
                let sync = new casync([
                    {store: c.store},
                    {with: '2sec-time'},  // This option seems to ignore user details
                ]);

                // Get destination checksum
                await destDigest(c.destination).then(data => {
                    checksum[c.destination] = data;
                    console.log(`Found checksum for destination ${c.destination}`);
                }).catch(err => {
                    console.error(`Unable to find checksum for destination ${c.destination}: ${err}`)
                });

                // Create casync instance for backup source
                let backupSync;
                if (c.backupIndex && c.backupStore) {
                    backupSync = new casync([
                        {store: c.backupStore},
                        {with: '2sec-time'},
                    ]);
                }

                // First run
                runCycle(c.index, sync, c.backupIndex, backupSync, c.destination);

                // Start the interval timer
                setInterval(async () => {
                    runCycle(c.index, sync, c.backupIndex, backupSync, c.destination);
                }, c.interval);
            }
            else {
                throw Error(`Invalid configuration: ${JSON.stringify(c)}`);
            }
        });
    }
    else {
        throw Error('Invalid configuration');
    }
}

/**
 * Run a casync cycle
 * @param {*} index 
 * @param {*} casync 
 * @param {*} backupIndex 
 * @param {*} backupSync 
 * @param {*} destination 
 */
 async function runCycle(index, casync, backupIndex, backupCasync, destination) {
    // Get the source checksum
    let sourceChecksum;
    await casync.digest(index).then(data => {
        sourceChecksum = data.trim();
        console.log(`Found checksum for source ${index}`);
    }).catch(err => {
        console.log(`Source index not available: ${index}`);
    });

    // Get the backup checksum
    let backupChecksum;
    if (backupCasync) {
        await backupCasync.digest(backupIndex).then(data => {
            backupChecksum = data.trim();
            console.log(`Found checksum for backup: ${backupIndex}`);
        }).catch(err => {
            console.log(`Backup index not available: ${backupIndex}`);
        });
    }

    // Check if source checksum changed (or first run)
    if (sourceChecksum && sourceChecksum !== checksum[destination]) {
        // Exctract source and update cached checksum
        await extract(index, destination, casync).then(data => {
            if (data) {
                checksum[destination] = data;
                console.log(`Extracted source from ${index} to ${destination}`);
            }
            else {
                console.log(`Failed to extract source from ${index} to ${destination}`);
            }
        }).catch(err => {
            console.error(`Failed to extract source from ${index} to ${destination}: ${err}`);
            delete checksum[destination];
        });
    }
    // If the source is not available, try to extract from backup source
    else if (!sourceChecksum && backupChecksum && checksum[destination] && 
        checksum[destination] !== backupChecksum) {
        await extractBackup(backupIndex, destination, backupCasync).then(data => {
            if (data) {
                checksum[destination] = data
                console.log(`Extracted backup from ${backupIndex} to ${destination}`);
            }
            else {
                console.error(`Failed to extract backup from ${backupIndex} to ${destination}`);
            };
        }).catch(err => {
            console.error(`Failed to extract backup from ${backupIndex} to ${destination}: ${err}`);
            delete checksum[destination];
        });
    }

    // check if backup checksum is outdated (or first run)
    if (backupCasync && checksum[destination] && backupChecksum !== checksum[destination]) {
        // Make backup archive
        await makeBackup(backupIndex, destination, backupCasync).then(data => {
            console.log(`Saved backup from ${destination} to ${backupIndex}`);
        }).catch(err => {
            console.log(`Unable to save backup from ${destination} to ${backupIndex}: ${err}`);
        });
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
function isEmptyDir(path) {
    try {
        let files = fs.readdirSync(path);
        if (files.length > 0) {
            return false;
        }
        else {
            return true;
        }
    } catch (error) {
        return true;
    }
}

/**
 * Digest the destination directory
 * @param {string} destination - path to destination directory
 * @returns Promise with checksum
 */
function destDigest(destination) {
    return new Promise((resolve, reject) => {
        new casync([{with: '2sec-time'}]).digest(destination).then(data => {
            resolve(data.trim());
        }).catch(err => {
            reject(err);
        });
    });
}

/**
 * Extract from a casync source to a local directory
 * @param {path} index 
 * @param {path} destination 
 * @param {object} casync 
 * @returns Promise with the checksum if the operation was successful
 */
function extract(index, destination, casync) {
    return new Promise((resolve, reject) => {
        // Check for valid data and valid destination
        if (dirExists(destination)) {
            casync.extract(index, destination).then(data => {
                if (data && data.stderr === '') {
                    // Get destination checksum
                    destDigest(destination).then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    });
                }
                else {
                    if (data && data.stderr) {
                        reject(data.stderr.trim());
                    }
                    else {
                        reject('');
                    }
                }
            }).catch(err => {
                reject(err);
            });
        }
        else {
            reject(`Destination directory ${destination} does not exist.`);
        }
    });
}

/**
 * Makes a backup of a local directory to a local casync destination
 * @param {string} index - destination casync index file path
 * @param {string} source - Source directory path
 * @param {object} casync - casync instance 
 * @returns Promise with the checksum if the operation was successful
 */
function makeBackup(index, source, casync) {
    return new Promise((resolve, reject) => {
        let dstDir = path.dirname(index);
        let srcExist = dirExists(source);
        let srcEmpty = false;
        if (srcExist) {srcEmpty = isEmptyDir(source)}
        let dstExist = dirExists(dstDir);

        // Check for valid index and source
        if (srcExist && !srcEmpty && dstExist) {
            casync.make(index, source).then(data => {
                if (data && data.stderr === ''  && data.stdout) {
                    // Resolve the checksum
                    resolve(data.stdout.trim());
                }
                else {
                    if (data && data.stderr) {
                        reject(data.stderr.trim());
                    }
                    else {
                        reject('');
                    }
                }
            }).catch(err => {
                reject(err);
            });
        }
        else {
            let msg = '';
            if (!srcExist) {msg += `Source directory ${source} does not exist; `}
            else if (srcEmpty) {msg += `Source directory ${source} is empty; `}
            if (!dstExist) {msg += `Destination directory ${dstDir} does not exist; `}
            reject(msg);
        }
    });
}

/**
 * Extract a backup from a local casync source to a local directory
 * @param {path} index 
 * @param {path} destination 
 * @param {object} casync 
 * @returns Promise with the checksum if the operation was successful
 */
function extractBackup(index, destination, casync) {
    return new Promise((resolve, reject) => {
        // Check for valid data and valid destination
        if (dirExists(destination) && fs.existsSync(index)) {
            casync.extract(index, destination).then(data => {
                if (data && data.stderr === '') {
                    // Get destination checksum
                    destDigest(destination).then(data => {
                        resolve(data);
                    }).catch(err => {
                        reject(err);
                    });
                }
                else {
                    if (data && data.stderr) {
                        reject(data.stderr.trim());
                    }
                    else {
                        reject('');
                    }
                }
            }).catch(err => {
                reject(err);
            });
        }
        else {
            reject(`Directory ${destination} or ${index} does not exist.`);
        }
    });
}
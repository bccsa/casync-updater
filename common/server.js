/*
 Server side script for creating archives
*/

const { casync } = require('./casync.js');
const { loadJSON, saveJSON } = require('./json.js');
const path = require('path');

/**
 * Run casync make according to configuration stored in the file as per passed configPath
 * @param {string} configPath 
 */
function run(configPath) {
    // Load configuration data passed via the first argument
    loadJSON(configPath).then(async (config) => {
        // validate configuration file data
        if (config && config.index && config.source) {
            // Create a new casync wrapper instance
            let c = new casync([
                {store: path.dirname(config.index) + '/data.castr'},      // Set the archive folder name to data (instead of default name of 'default)
                {with: '2sec-time'},                                      // This option seems to ignore user details
            ]);

            // Calculate / get checksums
            let dstChecksum, srcChecksum;
            await c.digest(config.index).then(checksum => {
                dstChecksum = checksum;
            });
            await c.digest(config.source).then(checksum => {
                srcChecksum = checksum;
            });

            // Compare checksums to detect changes in the source
            if (srcChecksum !== dstChecksum) {
                // Create or update the archive
                c.make(config.index, config.source).then(data => {
                    if (data.stderr && data.stderr != '') {
                        console.log(stderr.toString());
                    }
                    else {
                        console.log(`Created archive - checksum: ${data.stdout.trim()}`);
                    }
                }).catch(err => {
                    console.error(err);
                });
            }
            else {
                console.log('Source not changed');
            }
        }
    }).catch(err => {
        console.error(err);
    });
}

// Load config and make casync archive
if (process.argv.length > 2) {
    run(process.argv[2]);
}
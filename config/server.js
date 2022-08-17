/*
 Server side script for creating archives
*/

const { casync } = require('./casync.js');
const { loadJSON, saveJSON } = require('./json.js');

/**
 * Run casync make according to configuration stored in the file as per passed configPath
 * @param {string} configPath 
 */
function run(configPath) {
    // Load configuration data passed via the first argument
    loadJSON(configPath).then(async (config) => {
        // validate configuration file data
        if (config && config.index && config.store && config.source) {
            // casync options
            let options = [
                {store: config.store},
                {with: '2sec-time'},    // This option seems to ignore user details
            ];

            // Calculate / get checksums
            let dstChecksum, srcChecksum;
            await casync.digest(config.index, options).then(checksum => {
                dstChecksum = checksum;
            });
            await casync.digest(config.source, options).then(checksum => {
                srcChecksum = checksum;
            });

            // Compare checksums to detect changes in the source
            if (srcChecksum !== dstChecksum) {
                // Create or update the archive
                casync.make(config.index, config.source, options).then(data => {
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
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
            let srcOptions = [
                {with: '2sec-time'},    // This option seems to ignore user details
            ];
            let dstOptions = [
                {store: config.store},
                {with: '2sec-time'},
            ];

            // Calculate / get checksums
            let dstChecksum, srcChecksum;
            await casync.digest(config.index, dstOptions).then(checksum => {
                dstChecksum = checksum;
            }).catch(err => {
                console.error(`Unable to digest destination: ${err.message}`);
            });

            await casync.digest(config.source, srcOptions).then(checksum => {
                srcChecksum = checksum;
            }).catch(err => {
                console.error(`Unable to digest source: ${err.message}`);
            });

            // Compare checksums to detect changes in the source
            if (srcChecksum !== dstChecksum) {
                // Create or update the archive
                casync.make(config.index, config.source, dstOptions).then(data => {
                    if (data.stderr && data.stderr != '') {
                        console.log(stderr.toString());
                    }
                    else {
                        console.log(`Created archive - checksum: ${data.stdout.trim()}`);
                    }
                }).catch(err => {
                    console.error(`Unable to create archive: ${err}`);
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
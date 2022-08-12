/*
Metadata handling
*/

const { loadJSON, saveJSON } = require('./json.js');

/**
 * Saves a metadata file in the target directory with the UID and a timestamp
 * @param {string} UID - Unique identifier for the archive
 * @param {string} target - target directory
 * @retuns - Promise when the file has been created
 */
function saveMeta(UID, target) {
    let meta = {
        UID: UID,
        timestamp: new Date,
    }
    return saveJSON(target + "/.casync-update-meta", meta);
}

/**
 * Loads a metadata file from the target directory
 * @param {string} target 
 * @returns - Promise with metadata
 */
function loadMeta(target) {
    return loadJSON(target + "/.casync-update-meta");
}

/**
 * Compare a source metadata object to a destination metadata object to determine if the source has been updated (UID's matches and the source timestamp is greater than the destination timestamp).
 * @param {object} source 
 * @param {object} destination 
 * @returns true if the source is updated
 */
function compareMeta(source, destination) {
    return source && source.UID && source.timestamp && 
    destination && destination.UID && destination.timestamp && 
    source.timestamp > destination.timestamp;
}

module.exports.saveMeta = saveMeta;
module.exports.loadMeta = loadMeta;
module.exports.compareMeta = compareMeta;
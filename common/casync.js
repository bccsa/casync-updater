/**
 * Wrapper for casync
 */

const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * (Incomplete) nodejs Wrapper class for casync (see https://github.com/systemd/casync)
 */
class casync {
    /**
     * Create a new instance of the casync class
     * @param {object} options - casync options in the following format: [ {option1: value}, {option2, value}, ... , {optionN: value} ] }. For more information, see man casync.
     */
    constructor(options) {
        this._options = options;
    }

    /**
     * Creates a casync archive. For more information, see man casync.
     * @param {string} index - Index file name
     * @param {string} source - Path to directory or device
     * @returns - Promise when archive is created
     */
    make(index, source) {
        return exec(`casync make ${this._optionString} ${index} ${source}`);
    }

    /**
     * Extracts a casync archive. For more information, see man casync.
     * @param {string} index - Index file name
     * @param {string} destination - Path to directory or device
     * @returns - Promise when archive is extracted
     */
    extract(index, destination) {
        return exec(`casync extract ${this._optionString} ${index} ${destination}`);
    }

    /**
     * Calculates the checksum of the target archive (index file), directory or device. For more information, see man casync.
     * @param {*} target 
     * @returns - Promise containing the checksum
     */
    digest(target) {
        return new Promise((resolve, reject) => {
            exec(`casync digest ${this._optionString} ${target}`).then(data => {
                resolve(data.stdout.trim());
            }).catch(err => {
                reject(err);
            });
        });
    }

    /**
     * Removes chunks that are not used by the specified index. For more information, see man casync.
     * @param {*} index 
     * @returns - Promise when the operation is complete
     */
    gc(index) {
        return exec(`casync gc ${index}`);
    }

    get _optionString() {
        try {
            let s = '';
            this._options.forEach(option => {
                s += '--' + Object.keys(option)[0] + '=' + Object.values(option)[0] + ' ';
            });
            return s;
        }
        catch {
            throw Error('Invalid options format');
        }
    }
}

module.exports.casync = casync;
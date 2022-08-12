/*
 Disk manager
*/

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const EventEmitter = require('events');

/**
 * Disk manager class
 */
class diskManager extends EventEmitter {
    /**
     * Detects disk mounting and dismounting
     * @param  {BigInteger} interval - Scan interval in milliseconds
     * @event  on - 'attach': Returns drive data when a drive is attached; 'detach': Returns drive data when a drive is detached; 'mount': Returns drive data when a new mount is detected; 'unmount' Returns mount data of unmounted drive when an unmount is detected; 'update': Returns updated drive data;
     */
    constructor(interval) {
        super();

        this.interval = interval;
        this.drives = {};
        this.copyProgress = {};

        // Auto scan for drives.
        setInterval(() => {
            this.scan();
        }, this.interval);
    }

    /**
     * Scan for new or disconnected drives. Updates the drives object, and emits 'attach', 'detach', 'mount', 'unmount' and 'update' events.
     */
    scan() {
        // Run df command
        exec('lsblk -l -J -b -o NAME,PKNAME,TYPE,FSTYPE,MOUNTPOINT,FSSIZE,FSUSED,FSAVAIL,FSUSE%').then(output => {
            let d = {};     // Drives object
            let e = [];     // events dispatch cache

            // Loop through block devices returned from the lsblk command
            try {
                let lsblk = JSON.parse(output.stdout);
                if (lsblk.blockdevices != undefined) {
                    lsblk.blockdevices.forEach(device => {

                        // Only include partitions of disks (sda, sdb, etc)
                        if (device.type === 'part' && device.pkname.startsWith('sd')) {
                            d[device.name] = {
                                filesystem: device.name,
                                disk: device.pkname,
                                mountpoint: device.mountpoint,
                                type: device.fstype,
                                size: device.fssize,
                                used: device.fsused,
                                available: device.fsavail,
                                use_percent: device['fsuse%']
                            }
                        }
                    });
                }
            }
            catch (error) {
                console.log('Unable to scan drives: ' + error.message);
            }

            // Compare with global drives list
            Object.keys(this.drives).forEach(filesystem => {
                let drive = this.drives[filesystem];
                let update = d[filesystem]

                // Check if not exists in lsblk command output
                if (update == undefined) {
                    // Add events to be dispatched to the events cache.
                    // (Only dispatch after the full list is processed so that
                    // the disk list can be queried accurately after an event)

                    // Schedule unmount event for drives that are disconnected while still mounted
                    if (drive.mountpoint != null) {
                        e.push({ event: "unmount", data: drive });
                    }

                    // Drive is not listed in lsblk anymore, so send detach event
                    e.push({ event: "detach", data: drive });

                    // Remove from drives list
                    delete this.drives[filesystem];
                }
                else {
                    // Update drive data and fire events on data change
                    if (drive.mountpoint == null && update.mountpoint != null) {
                        drive.mountpoint = update.mountpoint;
                        drive.type = update.type;
                        drive.size = update.size;
                        e.push({ event: "mount", data: drive });
                    }
                    else if (drive.mountpoint != null && update.mountpoint == null) {
                        drive.mountpoint = update.mountpoint;
                        e.push({ event: "unmount", data: drive });
                    }
                    else if (drive.mountpoint != update.mountpoint) {
                        drive.mountpoint = update.mountpoint;
                        // e.push({ event: "unmount", data: drive });
                        e.push({ event: "mount", data: drive });
                    }
                    if (drive.used != update.used || drive.available != update.available || drive.use_percent != update.use_percent) {
                        drive.used = update.used;
                        drive.available = update.available;
                        drive.use_percent = update.use_percent;
                        e.push({ event: "update", data: drive });
                    }
                }
            });

            Object.keys(d).forEach(filesystem => {
                // Check if not exists in drives list
                if (this.drives[filesystem] == undefined) {
                    // Add events to be dispatched to the events cache.
                    // (Only dispatch after the full list is processed so that
                    // the disk list can be queried accurately after an event)
                    e.push({ event: "attach", data: d[filesystem] });

                    // Schedule mount event for drives that are mounted on connection
                    if (d[filesystem].mountpoint != null) {
                        e.push({ event: "mount", data: d[filesystem] });
                    }

                    // Add to drives list
                    this.drives[filesystem] = d[filesystem];
                }
            });

            // Dispatch events
            e.forEach(eventData => {
                this.emit(eventData.event, eventData.data);
            });

            e.length = 0;
        });
    }
}

module.exports.diskManager = diskManager;

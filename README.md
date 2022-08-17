# casync-updater
casync based OTA updater for software running on linux

## Introduction
A simple self updating software update system with offline updating capabilities through locally attached storage (e.g. a USB drive). More information on casync can be found on by running ```man casync```.

![Overview](doc/img/overview.png)

## Prerequisites
* diffutils
* casync

Installing on Debian / Ubuntu / Raspberry Pi OS:
```shell
sudo apt install diffutils casync
```

## Server
The server.js Node.js script should executed passing the configuration file as an argument:
```console
node /usr/bin/casync-updater/server.js /home/updater/updater.json
```
This can be included as part of your CI/CD pipeline.

Configuration file example:
```json
{
    "index": "/var/www/html/index.caidx",
    "store": "/var/www/html/store.castr",
    "source": "/home/updater/source"
}
```
where:
* "index" is the path to the casync index file (typically stored in a web root directory).
* "store" is the path to the casync store directory (typically stored in a web root directory).
* "source" is the path to the directory or device where the repository to be distributed is stored.

casync will create a ```data.castr``` storage directory in the same directory where the index (.caidx / .caibx) file is stored.

## Client


Configuration file example:
```json
[
    {
        "interval": 3600000,
        "srcIndex": "https://github.com/bccsa/casync-updater/updates/index.caidx",
        "srcStore": "https://github.com/bccsa/casync-updater/updates/store.castr",
        "dstPath": "/usr/bin/casync-updater"
    },
    {
        "interval": 1800000,
        "srcIndex": "https://myproject.example/updates/fancyName.caidx",
        "srcStore": "https://myproject.example/updates/fancyName.castr",
        "backupIndex": "/media/backupDrive/myproject-updater/otherFancyName.caidx",
        "backupStore": "/media/backupDrive/myproject-updater/otherFancyName.castr",
        "dstPath": "/usr/bin/myproject",
        "triggers": [
            {
                "paths": [
                    "path/to/file1",
                    ".",
                    "path/to/dir2"
                ],
                "actions": [
                    "sh /action/script/location.sh",
                    "systemctl restart your.service"
                ]
            },
            {
                "paths": [
                    "another/path"
                ],
                "actions": [
                    "node yourscript.js"
                ]
            }
        ]
    }
]
```
where:
* "interval" is the update interval in milliseconds
* "srcIndex" is the location of the (online) source casync (caidx) index file
* "srcStore" is the location if the (online) source casync (castr) store directory
* "backupIndex" (optional) is the path to the local backup casync index file (typically a location on external storage used for transferring updates to offline devices).
* "backupStore" (required only when backupIndex is set) is the path to the local backup casync store directory.
* "dstPath" is the local directory path to be updated
* "triggers" a list of paths and associated actions. When one of the specified "paths" (relative directory or file path) is updated, the list of "actions" is executed (shell commands).
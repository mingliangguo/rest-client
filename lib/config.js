(function() {
    let ini = require('ini'),
        path = require('path'),
        fs = require('fs-extra'); //File System - for file manipulation

    let config = ini.parse(fs.readFileSync(path.resolve('./', './config.ini'), 'utf-8'));
    module.exports = config;
})();

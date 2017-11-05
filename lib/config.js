'use strict';

let yaml = require('js-yaml'),
    path = require('path'),
    fs = require('fs-extra'); //File System - for file manipulation

const config_file = path.resolve('./', './config/config.yml');
if (!fs.existsSync(config_file)) {
    throw new Error(`Config file ${config_file} can not be found!`);
}
module.exports = yaml.safeLoad(
    fs.readFileSync(config_file, 'utf-8')
);

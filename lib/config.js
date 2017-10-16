'use strict';

let yaml = require('js-yaml'),
    path = require('path'),
    fs = require('fs-extra'); //File System - for file manipulation

let config = yaml.safeLoad(
    fs.readFileSync(path.resolve('./', './config/config.yml'), 'utf-8')
);
module.exports = config;

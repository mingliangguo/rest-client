'use strict';

const fs = require('fs'),
    path = require('path'),
    dateformat = require('dateformat'),
    winston = require('winston'),
    exec = require('child_process').exec,
    config = require('./config');

const DATE_IN_PATH = 'yyyy-mm-dd-HH-MM-ss';

let readable_timestamp = (fmt = DATE_IN_PATH) => {
    return dateformat(Date.now(), fmt);
};

let getOpenCmd = () => {
    switch (process.platform) {
    case 'darwin':
        return 'open';
    case 'win32':
    case 'win64':
        return 'start';
    default:
        return 'xdg-open';
    }
};

let avg = arr => {
    if (!arr || arr.length === 0) return 0;
    return (
        arr.reduce((sum, next) => {
            return sum + next;
        }, 0) / arr.length
    );
};

let argbGen = () => {
    let argb = [
        Math.random() * 256,
        Math.random() * 255,
        Math.random() * 255,
        Math.random() * 255
    ];
    argb = argb.map(num => padding(num.toString(16), 2)).join('');
    return argb.toUpperCase();
};

let openFile = filename => {
    if (!path.isAbsolute(filename)) {
        filename = path.resolve(process.cwd(), filename);
    }
    console.log('==> openning file', filename);
    exec(getOpenCmd() + ' ' + filename);
};

let replaceEnvVariable = s => {
    const envRegex = /\$\{(.*)\}/;
    if (!envRegex.test(s)) return s;
    let env = s.match(envRegex);
    return process.env[env[1]];
};

let padding = (num, pad) => {
    let base = Array(pad).join('0');
    return (base + num).slice(-pad);
};

let replacePathParams = function(url, params) {
    if (!params) {
        return url;
    }

    Object.keys(params).forEach(key => {
        url = url.replace(':' + key, params[key]);
    });
    return url;
};

let appendTimestamp = (filename, fmt) => {
    fmt = fmt || DATE_IN_PATH;
    return path.join(
        path.dirname(filename),
        path.basename(filename, path.extname(filename)) +
            '-' +
            dateformat(Date.now(), fmt) +
            path.extname(filename)
    );
};

/**
 * Mixin the objFrom to objTo
 * Only if overwrite=true is provided, the value in from will overwrite
 * the value in the to object.
 */
let mixin = function(objTo, objFrom, overwrite) {
    if (!objFrom) {
        return objTo;
    }
    if (!objTo) {
        objTo = {};
    }

    Object.keys(objFrom).forEach(key => {
        if (objTo[key]) {
            if (overwrite) {
                objTo[key] = objFrom[key];
            }
        } else {
            objTo[key] = objFrom[key];
        }
    });
    return objTo;
};

let delay = wait_time => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, wait_time);
    });
};

let saveJsonAsFile = function(json, filename) {
    fs.writeFile(filename, JSON.stringify(json), function(err) {
        if (err) {
            winston.log(
                'debug',
                'something went wrong when saving the resposne, error =>' + err
            );
            return winston.log('debug', err);
        }
        winston.log('debug', 'The file was saved!');
    });
};

let saveBinaryResponseAsFile = function (res, file_name) {
    res.setEncoding('binary');

    fs.writeFile(file_name, res.body, 'binary', function (err) {
        if (err) throw err;

        winston.log('info', 'File saved as %s', file_name);
    });
};

/**
 * Return the refreshed token json object in a Promise
 */
let readJsonFromFile = function(token_file) {
    return fs.readFileAsync(token_file).then(function(obj) {
        let json = {};
        try {
            json = JSON.parse(obj);
        } catch (err) {
            winston.log(
                'debug',
                'error occured during parsing json string',
                token_file,
                err
            );
        }
        return json;
    });
};

let updateJsonFile = function(json_str, filename) {
    winston.log(
        'debug',
        'entering updateJsonFile',
        filename,
        typeof json_str,
        json_str
    );
    readJsonFromFile(filename)
        .then(function(file_json) {
            let res_json = {};
            try {
                res_json = JSON.parse(json_str);
            } catch (err) {
                winston.log(
                    'error',
                    'error occured during parsing json string',
                    json_str
                );
            }
            Object.keys(res_json).forEach(key => {
                file_json[key] = res_json[key];
            });
            return file_json;
        })
        .then(function(json) {
            saveJsonAsFile(json, filename);
        });
};

let sequence = function*(count = Number.MAX_SAFE_INTEGER) {
    for (var i = 0; i < count; i++) {
        yield i;
    }
};

module.exports = {
    config: config,
    delay: delay,
    mixin: mixin,
    avg: avg,
    padding: padding,
    argbGen: argbGen,
    openFile: openFile,
    appendTimestamp: appendTimestamp,
    replaceEnvVariable: replaceEnvVariable,
    replacePathParams: replacePathParams,
    saveJsonAsFile: saveJsonAsFile,
    saveBinaryResponseAsFile: saveBinaryResponseAsFile,
    updateJsonFile: updateJsonFile,
    readJsonFromFile: readJsonFromFile,
    sequence: sequence
};

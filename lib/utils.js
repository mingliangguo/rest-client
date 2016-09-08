(function() {
    'use strict';

    const Bluebird = require('bluebird'),
        winston = require('winston'),
        fs = Bluebird.promisifyAll(require('fs'));

    let replacePathParams = function(url, params) {
        if (!params) {
            return url;
        }

        Object.keys(params).forEach(key => {
            url = url.replace(':' + key, params[key]);
        });
        return url;
    };

    exports.replacePathParams = replacePathParams;

    let saveBinaryResponseAsFile = function(res, file_name) {
        let imagedata = '';
        res.setEncoding('binary');

        fs.writeFile(file_name, res.body, 'binary', function(err) {
            if (err) throw err;

            winston.log("info", 'File saved as %s', file_name);
        });
    };

    exports.saveBinaryResponseAsFile = saveBinaryResponseAsFile;

    let saveJsonAsFile = function(json, filename) {
        fs.writeFile(filename, JSON.stringify(json), function(err) {
            if (err) {
                winston.log("debug", "something went wrong when saving the resposne, error =>" + err);
                return winston.log("debug", err);
            }
            winston.log("debug", "The file was saved!");
        });
    };
    exports.saveJsonAsFile = saveJsonAsFile;

    /**
     * Return the refreshed token json object in a Promise
     */
    let readJsonFromFile = function(token_file) {
        return fs.readFileAsync(token_file).then(function(obj) {
            let json = {};
            try {
                json = JSON.parse(obj);
            } catch (err) {
                winston.log('debug', 'error occured during parsing json string', token_file, err);
            }
            return json;
        });
    };

    exports.readJsonFromFile = readJsonFromFile;

    let updateJsonFile = function(json_str, filename) {
        winston.log('debug', 'entering updateJsonFile', filename, typeof json_str, json_str);
        readJsonFromFile(filename).then(function(file_json) {
            let res_json = {};
            try {
                res_json = JSON.parse(json_str);
            } catch (err) {
                winston.log('error', 'error occured during parsing json string', res.body, json_str);
            }
            Object.keys(res_json).forEach(key => {
                file_json[key] = res_json[key];
            });
            return file_json;
        }).then(function(json) {
            saveJsonAsFile(json, filename);
        });
    };
    exports.updateJsonFile = updateJsonFile;
    /**
     * Mixin the objFrom to objTo
     * Only if overwrite=true is provided, the value in from will overwrite 
     * the value in the to object.
     */
    let mixin = function(objFrom, objTo, overwrite) {
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

    exports.mixin = mixin;
})();

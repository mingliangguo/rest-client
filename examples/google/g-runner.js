(function() {
    'use strict';

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const yargs = require('yargs').argv,
        fs = require('fs-extra'), //File System - for file manipulation
        open = require('open'),
        winston = require('winston'),
        gapi = require('./g-client.js'),
        gclient = gapi.getRestClient(),
        utils = require('../../lib/utils.js'),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

    winston.level = process.env.LOG_LEVEL || 'info';

    const action = yargs.action;
    const action_handler = function(json) {
        winston.log("debug", "json is:", typeof json, json);
        const access_token = json.access_token;
        switch (action) {
            case 'refresh':
                // boxclient.getRefreshedAuthToken(token);
                gclient.token.refresh({
                    'body_params': {
                        'refresh_token': json.refresh_token
                    },
                    'contentType': 'form'
                });
                break;
            case 'clist':
                let params = {
                    'access_token': access_token
                };
                gclient.clist.get(params);
                break;
            default:
                winston.log("info", "Action:" + yargs.action + " is not supported!!!");
                break;
        }
    };

    if (Object.keys(yargs).length <= 2) {
        winston.log("info", "Usage: node g-runner.js --action=xxx [--yyy=zzz]");
        winston.log("info", "Usage: available actions: refresh, user, sharedItems, token, folders, folderItems");
    }
    winston.log("debug", "--- action is:" + action);

    if (action === 'oauth') {
        let url = gapi.getOAuthURL();
        winston.log('info', url);
        open(url);
    } else if (action === 'token') {
        gclient.token.code({
            'body_params': {
                'code': yargs.code
            },
            'contentType': 'form'
        });
    } else {
        utils.readJsonFromFile(require('path').resolve('./', config.google.config.token_json_file)).then(action_handler).catch(function(err) {
            winston.log('error', 'error occured during read token file', err);
        });
    }
})();
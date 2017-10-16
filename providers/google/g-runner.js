'use strict';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const yargs = require('yargs').argv,
    open = require('open'),
    logger = require('./../../lib/logger'),
    GoogleClient = require('./g-client'),
    utils = require('../../lib/utils'),
    config = require('../../lib/config');

logger.level = process.env.LOG_LEVEL || 'info';

let gclient = new GoogleClient();
const action = yargs.action;
const action_handler = function(json) {
    logger.log('debug', 'json is:', typeof json, json);
    const access_token = json.access_token;
    const params = {
        access_token: access_token
    };

    switch (action) {
    case 'refresh':
        // boxclient.getRefreshedAuthToken(token);
        gclient.token.refresh({
            body_params: {
                refresh_token: json.refresh_token
            },
            contentType: 'form'
        });
        break;
    case 'clist':
        gclient.clist.get(params);
        break;
    default:
        logger.log(
            'info',
            'Action:' + yargs.action + ' is not supported!!!'
        );
        break;
    }
};

if (Object.keys(yargs).length <= 2) {
    logger.log('info', 'Usage: node g-runner.js --action=xxx [--yyy=zzz]');
    logger.log(
        'info',
        'Usage: available actions: refresh, user, sharedItems, token, folders, folderItems'
    );
}
logger.log('debug', '--- action is:' + action);

if (action === 'oauth') {
    let url = gclient.getOAuthURL();
    logger.log('info', url);
    open(url);
} else if (action === 'token') {
    gclient.token.code({
        body_params: {
            code: yargs.code
        },
        contentType: 'form'
    });
} else {
    utils
        .readJsonFromFile(
            require('path').resolve('./', config.google.config.token_json_file)
        )
        .then(action_handler)
        .catch(function(err) {
            logger.log('error', 'error occured during read token file', err);
        });
}

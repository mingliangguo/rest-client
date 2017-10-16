'use strict';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const logger = require('./../../lib/logger'),
    yargs = require('yargs'),
    GithubApi = require('./github-api');

let ghapi = new GithubApi();
const action_handler = function() {
    const action = yargs.action;
    logger.log('info', '--- action is:' + action);

    switch (action) {
    case 'org':
        ghapi.getOrg(yargs.oid);
        break;
    case 'orgRepos':
        ghapi.getOrgRepos(yargs.oid);
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

action_handler(yargs);

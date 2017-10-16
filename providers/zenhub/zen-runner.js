'use strict';

const yargs = require('yargs').argv,
    logger = require('./../../lib/logger'),
    ZenhubApi = require('./zenhub-api');

const zapi = new ZenhubApi();

const action = yargs.action;
const action_handler = function() {
    switch (action) {
    case 'issues':
        zapi.getIssues(yargs.rid);
        break;
    case 'issue':
        zapi.getIssue(yargs.rid, yargs.iid);
        break;
    case 'epics':
        zapi.getEpics(yargs.rid);
        break;
    case 'epic':
        zapi.getEpic(yargs.rid, yargs.eid);
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

action_handler();

(function() {
    'use strict';

    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const yargs = require('yargs').argv,
        fs = require('fs-extra'), //File System - for file manipulation
        open = require('open'),
        winston = require('winston'),
        zapi = require('./zen-client.js'),
        utils = require('../../lib/utils.js'),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    winston.level = process.env.LOG_LEVEL || 'info';

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
                winston.log("info", "Action:" + yargs.action + " is not supported!!!");
                break;
        }
    };

    if (Object.keys(yargs).length <= 2) {
        winston.log("info", "Usage: node g-runner.js --action=xxx [--yyy=zzz]");
        winston.log("info", "Usage: available actions: refresh, user, sharedItems, token, folders, folderItems");
    }
    winston.log("debug", "--- action is:" + action);

    action_handler();
})();
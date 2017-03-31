////////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';

    const yargs = require('yargs').argv,
        fs = require('fs-extra'), //File System - for file manipulation
        open = require('open'),
        boxapi = require('./box-client.js'),
        boxclient = boxapi.getBoxClient(),
        winston = require('winston'),
        path = require('path'),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
        utils = require('../../lib/utils.js'),
        serverToken = require('./server-token.js');

    winston.level = process.env.LOG_LEVEL || 'info';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const action_handler = function(json) {
        let token = null;
        try {
            token = JSON.parse(json);
        } catch (e) {
            console.error("==> Error occured while parsing token json, :", json);
            throw new Error('Quit since no token to use!!!');
        }
        const access_token = token.access_token;
        // const access_token = '31GJiZgO2KI04chxAO4CEgIBI9hzQhjf';
        // winston.log("info", 'access_token: ' + token.access_token, token);

        const action = yargs.action;
        switch (action) {
            case 'refresh':
                // boxclient.getRefreshedAuthToken(token);
                boxapi.refreshToken(token.refresh_token);
                break;
            case 'user':
                boxapi.getUserInfo(yargs.uid, yargs.fields, access_token);
                break;
            case 'users':
                boxapi.getUsers(yargs.filter, yargs.limit, yargs.offset, yargs.login, access_token);
                break;
            case 'createUser':
                // requires server token
                boxapi.createUser(yargs.name, yargs.login, access_token);
                break;
            case 'createFolder':
                boxapi.createFolder(yargs.name, yargs.pid, access_token);
                break;
            case 'sharedLink':
                boxapi.createSharedLink(yargs.fid, access_token);
                break;
            case 'copyFile':
                boxapi.copyFile(yargs.fid, yargs.pid, access_token);
                break;
            case 'sharedItems':
                boxapi.getSharedItems(yargs.link, access_token);
                break;
            case 'folder':
                boxapi.getFolderInfo(yargs.fid, yargs.fields, access_token);
                break;
            case 'addFolderMd':
                boxapi.addFolderMD(yargs.fid, yargs.tname, yargs.tval, access_token);
                break;
            case 'getFolderMd':
                boxapi.getFolderMD(yargs.fid, yargs.tname, access_token);
                break;
            case 'renameFolder':
                boxapi.renameFolder(yargs.fid, yargs.name, access_token);
                break;
            case 'searchMD':
                boxapi.searchMD(access_token);
                break;
            case 'folderItems':
                boxapi.getFolderItems(yargs.fid, yargs.fields, access_token);
                break;
            case 'file':
                boxapi.getFileInfo(yargs.fid, yargs.fields, access_token);
                break;
            case 'thumbnail':
                boxapi.getThumbnail(yargs.fid, yargs.link, access_token);
                break;
            case 'preview':
                boxapi.createPreviewLink(yargs.fid, access_token);
                break;
            case 'addCollab':
                boxapi.addCollab(yargs.fid, yargs.role, yargs.uid, yargs.login, access_token);
                break;
            case 'getFolderCollab':
                boxapi.getFolderCollab(yargs.fid, access_token);
                break;
            case 'getCollab':
                boxapi.getCollab(yargs.cid, access_token);
                break;
            case 'viewPath':
                boxapi.createViewPath(yargs.fid, yargs.uid, yargs.role, access_token);
                break;
            case 'oauth':
                open(boxapi.getOAuthURL());
                break;
            case 'authorize':
                boxapi.initialAuthorize(yargs.redirect_uri);
                break;
            case 'createMetadata':
                boxapi.createMetadata(access_token, yargs.templateKey, yargs.templateName, yargs.fields);
                break;
            default:
                winston.log("error", "Action:" + yargs.action + " is not supported!!!");
                break;
        }
    };

    if (Object.keys(yargs).length <= 2) {
        winston.log("info", "Usage: node boxclient.js --action=xxx [--yyy=zzz]");
        winston.log("info", "Usage: available actions: refresh, user, sharedItems, token, folders, folderItems");
    } else {
        const action = yargs.action;
        winston.log("info", "--- action is:" + action);

        if (action === 'oauth') {
            open(boxapi.getOAuthURL());
        } else if (action === 'token' && yargs.code) {
            boxapi.requestAccessToken(yargs.code);
        } else if (config.box.config.use_server_token === true) {
            winston.log("info", "===> use server token");
            serverToken.getServerToken((res) => {
                action_handler(res.body);
            });
        } else {
            winston.log("info", "===> use token file");
            utils.readJsonFromFile(path.resolve('./', config.box.config.token_json_file)).then(action_handler).catch(function(err) {
                console.error(err);
                if (action === 'oauth') {
                    open(boxclient.getOAuthURL());
                }
            });
        }
    }
})();
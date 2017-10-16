////////////////////////////////////////////////////////////////////////////////

'use strict';

const yargs = require('yargs').argv,
    open = require('open'),
    path = require('path'),
    BoxApi = require('./box-api'),
    BoxOAuth = require('./box-oauth'),
    logger = require('./../../lib/logger'),
    utils = require('./../../lib/utils'),
    config = require('./../../lib/config');

const action_handler = function(boxapi) {
    const action = yargs.action;
    let token = {};
    logger.log('info', `action is => [${action}]`);
    switch (action) {
    case 'refresh':
        // boxclient.getRefreshedAuthToken(token);
        token = utils.readJsonFromFile(
            path.resolve('./', config.box.params.config.token_json_file)
        );
        boxapi.refreshToken(token.refresh_token);
        break;
    case 'user':
        boxapi.getUserInfo(yargs.uid, yargs.fields).then(res => {
            logger.log('info', `user info is: ${res.body}`);
        });
        break;
    case 'users':
        boxapi.getUsers(
            yargs.filter,
            yargs.limit,
            yargs.offset,
            yargs.login
        );
        break;
    case 'createUser':
        // requires server token
        boxapi.createUser(yargs.name, yargs.login);
        break;
    case 'createFolder':
        boxapi.createFolder(yargs.name, yargs.pid).then(res => {
            logger.log('info', `Create folder response: [${res.body}]`);
        });
        break;
    case 'sharedLink':
        boxapi.createSharedLink(yargs.fid);
        break;
    case 'copyFile':
        boxapi.copyFile(yargs.fid, yargs.pid);
        break;
    case 'sharedItems':
        boxapi.getSharedItems(yargs.link);
        break;
    case 'folder':
        boxapi.getFolderInfo(yargs.fid, yargs.fields);
        break;
    case 'addFolderMd':
        boxapi.addFolderMD(yargs.fid, yargs.tname, yargs.tval);
        break;
    case 'getFolderMd':
        boxapi.getFolderMD(yargs.fid, yargs.tname);
        break;
    case 'renameFolder':
        boxapi.renameFolder(yargs.fid, yargs.name);
        break;
    case 'searchMD':
        boxapi.searchMD();
        break;
    case 'folderItems':
        boxapi.getFolderItems(yargs.fid, yargs.fields).then(res => {
            logger.log('info', `folder items response: [${res.body}]`);
        });
        break;
    case 'file':
        boxapi.getFileInfo(yargs.fid, yargs.fields);
        break;
    case 'thumbnail':
        boxapi.getThumbnail(yargs.fid, yargs.link);
        break;
    case 'preview':
        boxapi.createPreviewLink(yargs.fid);
        break;
    case 'addCollab':
        boxapi.addCollab(yargs.fid, yargs.role, yargs.uid, yargs.login);
        break;
    case 'getFolderCollab':
        boxapi.getFolderCollab(yargs.fid);
        break;
    case 'getCollab':
        boxapi.getCollab(yargs.cid);
        break;
    case 'viewPath':
        boxapi.createViewPath(
            yargs.fid,
            yargs.role,
            yargs.uid,
            yargs.login
        );
        break;
    case 'oauth':
        open(boxapi.getOAuthURL());
        break;
    case 'authorize':
        boxapi.initialAuthorize(yargs.redirect_uri);
        break;
    case 'createMetadata':
        boxapi.createMetadata(
            yargs.templateKey,
            yargs.templateName,
            yargs.fields
        );
        break;
    case 'batchUsers':
        console.log('uids:' + yargs.uids);
        boxapi.batchUsers(`${yargs.uids}`.split(',')).then(res => {
            logger.log('info', 'received response:');
            logger.log('info', `response is => ${res.body}`);
            console.log(`response is => ${res.body}`);
        });
        break;
    default:
        logger.log(
            'error',
            'Action:' + yargs.action + ' is not supported!!!'
        );
        break;
    }
};

if (Object.keys(yargs).length <= 2) {
    logger.log('info', 'Usage: node boxclient.js --action=xxx [--yyy=zzz]');
    logger.log(
        'info',
        'Usage: available actions: refresh, user, sharedItems, token, folders, folderItems'
    );
} else {
    const action = yargs.action;
    logger.log('info', '--- action is:' + action);

    // if (action === 'oauth') {
    //     open(boxapi.getOAuthURL());
    // } else if (action === 'token' && yargs.code) {
    //     boxapi.requestAccessToken(yargs.code);
    if (yargs.token === 'server') {
        logger.log('info', '===> use server token');
        config.box.jwt_app =
            config.box[`jwt_app_${yargs.app}`] || config.box.jwt_app;
        let boxapi = new BoxApi(config.box);
        boxapi.getServerToken().then(() => {
            action_handler(boxapi);
        });
    } else if (yargs.token === 'oauth') {
        logger.log('info', '===> use token file');

        let oauthapp =
            config.box[`oauth_app_${yargs.app}`] || config.box.oauth_app;
        
        let boxapi = new BoxApi(config.box);
        BoxOAuth(oauthapp.redirect_url, oauthapp.user, oauthapp.password)
            .then(params => {
                logger.log('info', `oauth params: ${JSON.stringify(params)}`);
                return boxapi.requestAccessToken(params.oauth_code);
            })
            .then(() => {
                action_handler(boxapi);
            })
            .catch(function(err) {
                console.error(err);
                if (action === 'oauth') {
                    open(boxapi.getOAuthURL());
                }
            });
    }
}

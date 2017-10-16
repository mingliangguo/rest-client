////////////////////////////////////////////////////////////////////////////////

'use strict';

const yargs = require('yargs').argv,
    open = require('open'),
    fs = require('fs'),
    path = require('path'),
    BoxApi = require('./box-api'),
    BoxOAuth = require('./box-oauth'),
    logger = require('./../../lib/logger'),
    utils = require('./../../lib/utils'),
    config = require('./../../lib/config');

const box_config = config.box;
const handleAction = (boxapi, args) => {
    const action = args.action;
    logger.log('info', `action is => [${action}]`);
    switch (action) {
    case 'refresh':
        if (!fs.existsSync(path.resolve('./', box_config.params.config.token_json_file))) {
            throw new Error(`token file [${box_config.params.config.token_json_file} doesn't exist!]`);
        }
        return boxapi.refreshToken(
            utils.readJsonFromFile(
                path.resolve('./', box_config.params.config.token_json_file)
            ).refresh_token
        );
    case 'user':
        return boxapi.getUserInfo(args.uid, args.fields);
    case 'users':
        return boxapi.getUsers(
            args.filter,
            args.limit,
            args.offset,
            args.login
        );
    case 'createUser':
        return boxapi.createUser(args.name, args.login);
    case 'createFolder':
        return boxapi.createFolder(args.name, args.pid);
    case 'sharedLink':
        return boxapi.createSharedLink(args.fid);
    case 'copyFile':
        return boxapi.copyFile(args.fid, args.pid);
    case 'sharedItems':
        return boxapi.getSharedItems(args.link);
    case 'folder':
        return boxapi.getFolderInfo(args.fid, args.fields);
    case 'trashItems':
        return boxapi.getTrashedItems(args.limit, args.offset);
    case 'restoreFolder':
        return boxapi.restoreFolder(args.fid);
    case 'restoreAllFolders':
        return boxapi.restoreAllFolders(args.async);
    case 'addFolderMd':
        return boxapi.addFolderMD(args.fid, args.tname, args.tval);
    case 'getFolderMd':
        return boxapi.getFolderMD(args.fid, args.tname);
    case 'renameFolder':
        return boxapi.renameFolder(args.fid, args.name);
    case 'searchMD':
        return boxapi.searchMD();
    case 'folderItems':
        return boxapi.getFolderItems(args.fid, args.fields);
    case 'file':
        return boxapi.getFileInfo(args.fid, args.fields);
    case 'thumbnail':
        return boxapi.getThumbnail(args.fid, args.link);
    case 'preview':
        return boxapi.createPreviewLink(args.fid);
    case 'addCollab':
        return boxapi.addCollab(args.fid, args.role, args.uid, args.login);
    case 'updateCollab':
        return boxapi.updateCollab(args.cid, args.role);
    case 'getFolderCollab':
        return boxapi.getFolderCollab(args.fid);
    case 'getCollab':
        return boxapi.getCollab(args.cid);
    case 'viewPath':
        return boxapi.createViewPath(
            args.fid,
            args.role,
            args.uid,
            args.login
        );
    case 'oauth':
        return open(boxapi.getOAuthURL());
    case 'authorize':
        return boxapi.initialAuthorize(args.redirect_uri);
    case 'createMetadata':
        return boxapi.createMetadata(
            args.templateKey,
            args.templateName,
            args.fields
        );
    case 'batchUsers':
        return boxapi.batchUsers(`${args.uids}`.split(','));
    default:
        logger.log(
            'error',
            'Action:' + args.action + ' is not supported!!!'
        );
        break;
    }
};

const authenticate = args => {
    let { token, app, eid, user, password } = args;
    if (token === 'server') {
        const jwt_app = config.box[`jwt_app_${app}`] || config.box.jwt_app;
        eid =
            eid || jwt_app.enterprise.id;

        logger.log('info', `===> use jwt token [${app}] with enterprise[${jwt_app.enterprise.id}]`);
        let boxapi = new BoxApi(config.box);
        return boxapi.getServerToken(jwt_app, eid).then(() => boxapi);
    } else if (token === 'oauth') {

        let boxapi = new BoxApi(config.box);
        let oauthapp = config.box[`oauth_app_${app}`] || config.box.oauth_app;
        user = user || oauthapp.user;
        password = password || oauthapp.password;
        logger.log('info', `===> start oauth [${oauthapp.redirect_url}] as [${user}] ... `);
        return BoxOAuth(oauthapp.redirect_url, user, password)
            .then(params => {
                logger.log('debug', `oauth params: ${JSON.stringify(params)}`);
                return boxapi.requestAccessToken(params.oauth_code, oauthapp);
            })
            .then(() => boxapi);
    }
};

if (Object.keys(yargs).length <= 2) {
    logger.log('info', 'Usage: npm run box -- --action=xxx [--yyy=zzz]');
    logger.log(
        'info',
        'Sample1: npm run box -- --action=user --uid=me --token=oauth --app=myapp --user=myuser@gmail.com --passwd=password'
    );
    logger.log(
        'info',
        'Sample2: npm run box -- --action=user --uid=me --token=server --app=myapp --eid=123456'
    );
} else {
    authenticate(yargs)
        .then(boxapi => handleAction(boxapi, yargs))
        .then(res => {
            // only display information if a response object is returned
            if (res && res.statusCode) {
                let prettyJson =
                    res.body && JSON.stringify(JSON.parse(res.body), null, 2);
                logger.log(
                    'info',
                    `Request returns [${res.statusCode}] with body =>\n`,
                    prettyJson
                );
            }
        })
        .catch(err => {
            logger.log('error', 'error received!', err);
        });
}

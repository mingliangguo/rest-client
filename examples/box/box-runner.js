////////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';

    const yargs = require('yargs').argv,
        fs = require('fs-extra'), //File System - for file manipulation
        open = require('open'),
        boxapi = require('./box-client.js'),
        boxclient = require('./box-client.js').getBoxClient(),
        winston = require('winston'),
        path = require('path'),
        config = require('../../lib/config.js'),
        utils = require('../../lib/utils.js'),
        serverToken = require('./server-token.js');

    winston.level = process.env.LOG_LEVEL || 'info';

    const action_handler = function(json) {
        let token = null;
        try {
            token = JSON.parse(json);
        } catch (e) {
            console.error("==> Error occured while parsing token json, :", json);
        }
        const access_token = token.access_token;
        // winston.log("info", 'access_token: ' + token.access_token, token);

        const action = yargs.action;
        switch (action) {
            case 'refresh':
                // boxclient.getRefreshedAuthToken(token);
                boxclient.token.refresh({
                    'body_params': {
                        'refresh_token': token.refresh_token
                    },
                    'contentType': 'form'
                });
                break;
            case 'user':
                let uid = yargs.uid;
                winston.log("info", "--- enter user :" + action + ", uid: " + uid);
                boxclient.user.info({
                    'access_token': access_token,
                    'path_params': {
                        'uid': yargs.uid
                    },
                    'query_params': {
                        'fields': 'id,name,login,language,timezone,avatar_url,enterprise'
                    }
                });
                break;
            case 'users':
                winston.log("info", "--- enter users :" + action);
                let params = {
                    'access_token': access_token,
                    'query_params': {
                        'fields': 'id,name,login,language,timezone,avatar_url,enterprise',
                        'user_type': 'all'
                    }
                };
                if (yargs.login) {
                    params.query_params.filter_term = yargs.login;
                    params.query_params.user_type = 'external';
                }
                boxclient.users.get(params);
                break;
            case 'createUser':
                // requires server token
                boxclient.users.create({
                    'access_token': access_token,
                    'body_params': {
                        "name": yargs.name,
                        "login": yargs.login
                    }
                });
                break;
            case 'createFolder':
                winston.log("info", '--- begin create folder:');
                boxclient.folders.post({
                    'access_token': access_token,
                    'body_params': {
                        "name": yargs.name,
                        "parent": {
                            "id": yargs.pid || '0'
                        }
                    }
                });
                break;
            case 'sharedLink':
                winston.log("info", "--- enter sharedLink :" + action);
                const fid = yargs.fid;
                boxclient.file.createSharedLink({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    }
                });
                break;
            case 'sharedItems':
                winston.log("info", "--- enter sharedItems :" + action);
                const link = yargs.link;
                boxclient.sharedItems.get({
                    'access_token': access_token,
                    'headers': {
                        'BoxApi': 'shared_link=' + yargs.link
                    }
                });
                break;
            case 'folder':
                boxclient.folder.info({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    }
                });
                break;
            case 'addFolderMd':
                boxclient.getBoxClient().folderMetadata.create({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid,
                        'scope': 'enterprise',
                        'template': yargs.tname
                    },
                    'body_params': {
                        'taskflowTemplateRefName': yargs.tval
                    }
                });
                break;
            case 'getFolderMd':
                boxclient.folderMetadata.get({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid,
                        'scope': 'enterprise',
                        'template': yargs.tname
                    }
                });
                break;
            case 'searchMD':
                boxclient.search.get({
                    'access_token': access_token,
                    'query_params': {
                        'type': 'folder',
                        'scope': 'enterprise_content',
                        'ancestor_folder_ids': '6887024810',
                        'mdfilters': JSON.stringify([{
                            'templateKey': 'IBM_TASKFLOW_METADATA_TEMPLATE_TEST',
                            'scope': 'enterprise',
                            'filters': {
                                'taskflowTemplateRefName': 'greatTaskflow'
                            }
                        }])
                    }
                });
                break;
            case 'folderItems':
                boxclient.folder.getItems({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    },
                    'query_params': {
                        'fields': yargs.fields
                    }
                });
                break;
            case 'file':
                boxclient.file.info({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    }
                });
                break;
            case 'thumbnail':
                boxclient.file.getThumbnail({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid,
                        'extension': 'png'
                    }
                });
                break;
            case 'preview':
                boxclient.file.createPreviewLink({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    }
                });
                break;
            case 'addCollab':
                let postParams = {
                    'access_token': access_token,
                    'body_params': {
                        "item": {
                            "id": yargs.fid,
                            "type": "folder"
                        },
                        "accessible_by": {
                            "type": "user"
                        },
                        "role": yargs.role || "editor"
                    }
                };
                if (yargs.uid) {
                    postParams.body_params.accessible_by.id = yargs.uid;
                } else if (yargs.login) {
                    postParams.body_params.accessible_by.login = yargs.login;
                }
                boxclient.collaborations.add(postParams);
                break;
            case 'getFolderCollab':
                boxclient.folder.getCollab({
                    'access_token': access_token,
                    'path_params': {
                        'fid': yargs.fid
                    }
                });
                break;
            case 'getCollab':
                boxclient.collaboration.get({
                    'access_token': access_token,
                    'path_params': {
                        'cid': yargs.cid
                    }
                });
                break;
            case 'viewPath':
                boxclient.collaborations.add({
                    'access_token': access_token,
                    'body_params': {
                        "item": {
                            "id": yargs.fid,
                            "type": "folder"
                        },
                        "accessible_by": {
                            "id": yargs.uid,
                            "type": "user"
                        },
                        "can_view_path": true,
                        "role": yargs.role || "editor"
                    }
                });
                break;
            case 'oauth':
                open(boxapi.getOAuthURL());
                break;
            default:
                console.error("$$$ Action:" + yargs.action + " is not supported!!!");
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
            boxclient.getBoxClient().token.code({
                'body_params': {
                    'code': yargs.code
                },
                'contentType': 'form'
            });
        } else if (action === 'createAppUser') {
            serverToken.getServerToken(function(response) {
                let json = response.body;
                winston.log("info", "===> server token:", json);
                const token = JSON.parse(json);
                boxclient.getBoxClient().users.create({
                    'access_token': token.access_token,
                    'body_params': {
                        "name": yargs.name,
                        "is_platform_access_only": true
                    }
                });
            });
        } else if (config.USE_SERVER_TOKEN === true) {
            winston.log("info", "===> use server token");
            serverToken.getServerToken((res) => {
                action_handler(res.body);
            });
        } else {
            winston.log("info", "===> use token file");
            utils.readJsonFromFile(path.resolve('./', config.BOX_TOKEN_JSON_FILE)).then(action_handler).catch(function(err) {
                console.error(err);
                if (action === 'oauth') {
                    open(boxclient.getOAuthURL());
                }
            });
        }
    }
})();

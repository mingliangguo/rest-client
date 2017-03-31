(function() {
    'use strict';

    const Bluebird = require('bluebird'),
        fs = Bluebird.promisifyAll(require('fs')),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
        winston = require('winston'),
        path = require('path'),
        utils = require('../../lib/utils.js'),
        RestApi = require('../../lib/rest-client.js');

    const BOX_API_HOST = config.box.api.api_base_url,
        BOX_CLIENT_ID = config.box.app.client_id,
        BOX_CLIENT_SECRET = config.box.app.client_secret,
        TOKEN_FILE = path.resolve('./', config.box.config.token_json_file),
        THUMBNAIL_FILE = path.resolve('./', 'thumbnail.png');

    let boxclient = null;

    let getBoxRestDefinition = function() {
        return {
            'authorize': {
                'baseUrl': config.box.api.api_base_url,
                'endpoint': '/api/oauth2/authorize',
                'methods': [{
                        'id': 'get',
                        'method': 'GET',
                        'query_params': {
                            'response_type': 'code',
                            'client_id': BOX_CLIENT_ID
                        }
                    },
                    {
                        'id': 'post',
                        'method': 'POST',
                        'query_params': {
                            'response_type': 'code',
                            'client_id': BOX_CLIENT_ID
                        }
                    }
                ]
            },
            'token': {
                'endpoint': '/oauth2/token',
                'methods': [{
                    'id': 'code',
                    'method': 'POST',
                    'body_params': {
                        "grant_type": "authorization_code",
                        "client_id": BOX_CLIENT_ID,
                        "client_secret": BOX_CLIENT_SECRET
                    },
                    'query_params': {},
                    'callback': function(res) {
                        utils.saveJsonAsFile(res.body, TOKEN_FILE);
                    }
                }, {
                    'id': 'server',
                    'method': 'POST',
                    'body_params': {
                        'grant_type': "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        'client_id': BOX_CLIENT_ID,
                        'client_secret': BOX_CLIENT_SECRET
                    }
                }, {
                    'id': 'refresh',
                    'method': 'POST',
                    'body_params': {
                        "client_id": BOX_CLIENT_ID,
                        "client_secret": BOX_CLIENT_SECRET,
                        "grant_type": "refresh_token"
                    },
                    'callback': function(res) {
                        utils.saveJsonAsFile(res.body, TOKEN_FILE);
                    }
                }]
            },
            'oauth': {
                'endpoint': 'oauth',
                'methods': [{
                    'id': 'get'
                }]
            },
            'search': {
                'endpoint': '/2.0/search/',
                'methods': [{
                    'id': 'get'
                }]
            },
            'folders': {
                'endpoint': '/2.0/folders',
                'methods': [{
                    'id': 'get'
                }, {
                    'id': 'post',
                    'method': 'POST'
                }]
            },
            'sharedItems': {
                'endpoint': '/2.0/shared_items',
                'methods': [{
                    'id': 'get'
                }]
            },
            'folder': {
                'endpoint': '/2.0/folders/:fid',
                'methods': [{
                    'id': 'info',
                    'mehtod': 'GET'
                }, {
                    'id': 'createSharedLink',
                    'method': 'PUT',
                    'body_params': {
                        'shared_link': {
                            'access': 'open'
                        }
                    }
                }, {
                    'id': 'rename',
                    'method': 'PUT'
                }, {
                    'id': 'createPreviewLink',
                    'method': 'GET',
                    'query_params': {
                        'fields': 'expiring_embed_link'
                    }
                }, {
                    'id': 'getItems',
                    'path': '/items',
                    'method': 'GET'
                }, {
                    'id': 'getCollab',
                    'path': '/collaborations',
                    'method': 'GET'
                }, {
                    'id': 'getMetadata',
                    'path': '/metadata/:scope/:template',
                    'method': 'GET'
                }, {
                    'id': 'createMetadata',
                    'path': '/metadata/:scope/:template',
                    'method': 'POST'
                }]
            },
            'file': {
                'endpoint': '/2.0/files/:fid',
                'methods': [{
                    'id': 'info',
                    'mehtod': 'GET'
                }, {
                    'id': 'createSharedLink',
                    'method': 'POST',
                    'body_params': {
                        'shared_link': {
                            'access': 'open'
                        }
                    }
                }, {
                    'id': 'copy',
                    'path': '/copy',
                    'method': 'POST',
                    'body_params': {
                        'parent': {
                            'id': 'pid'
                        }
                    }
                }, {
                    'id': 'createPreviewLink',
                    'method': 'GET',
                    'query_params': {
                        'fields': 'expiring_embed_link'
                    }
                }, {
                    'id': 'getThumbnail',
                    'path': '/thumbnail.:extension',
                    'method': 'GET',
                    'binaryBody': true,
                    'callback': function(res) {
                        utils.saveBinaryResponseAsFile(res, THUMBNAIL_FILE);
                    },
                    'query_params': {
                        'min_height': 128,
                        'min_width': 128
                    }
                }]
            },
            'collaborations': {
                'endpoint': '/2.0/collaborations',
                'methods': [{
                    'id': 'get'
                }, {
                    'id': 'add',
                    'method': 'POST'
                }]
            },
            'collaboration': {
                'endpoint': '/2.0/collaborations/:cid',
                'methods': [{
                    'id': 'get'
                }]
            },
            'users': {
                'endpoint': '/2.0/users',
                'methods': [{
                    'id': 'get',
                    'method': 'GET',
                    'query_params': {
                        "fields": "name,login,language,role,timezone,enterprise"
                    }
                }, {
                    'id': 'create',
                    'method': 'POST'
                }]
            },
            'user': {
                'endpoint': '/2.0/users/:uid',
                'methods': [{
                    'id': 'info',
                    'method': 'GET',
                    'query_params': {
                        "fields": "name,login,language,role,timezone,enterprise"
                    }
                }]
            },
            'metadata': {
                'endpoint': '/2.0/metadata_templates',
                'methods': [{
                    'id': 'create',
                    'method': 'POST',
                    'path': '/schema',
                    'body_params': {
                        'scope': 'enterprise',
                        'templateKey': '',
                        'displayName': '',
                        'fields': []
                    }
                }]
            }
        };
    };

    /**
     * Box request handler.
     * Sample input for params:
     * <Pre>
     * {
     *   'endpoint':  'https://api.box.com/2.0/folders/:fid',
     *   'method': 'GET',
     *   'path_params': {
     *      'fid': 392032000232
     *    },
     *   'query_params': {
     *      'fields': 'modified_at,path_collection,name'
     *    },
     *   'body_params': {
     *    },
     *    'access_token': 'abcdefghijklmn123456789',
     *    'callback': callbackFunc
     * }
     * </Pre>
     */
    let boxRequestHandler = function(options, params) {
        let access_token = params.access_token;

        if (access_token) {
            options.headers = utils.mixin({
                "Authorization": "Bearer " + access_token
            }, options.headers);
        }

        return options;
    };


    exports.getBoxClient = function() {
        if (!boxclient) {
            let jsonDefinitions = getBoxRestDefinition();
            boxclient = RestApi.getRestApi(BOX_API_HOST, jsonDefinitions, {
                'requestHandler': boxRequestHandler
            });
        }
        return boxclient;
    };

    exports.getOAuthURL = function() {
        let url = [
            config.box.api.oauth_base_url,
            "/authorize?response_type=code&client_id=",
            BOX_CLIENT_ID,
            "&state=security_tokenDKnhMJatFipTAnM0nHlZA"
        ].join("");
        // always dump the oauth URL to the console
        console.log("info", url);
        return url;
    };

    exports.getFolderCollab = function(fid, access_token) {
        return boxclient.folder.getCollab({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            }
        });
    };

    exports.getCollab = function(cid, access_tokne) {
        return boxclient.collaboration.get({
            'access_token': access_token,
            'path_params': {
                'cid': cid
            }
        });
    };

    exports.addCollab = function(fid, role, uid, login, access_token) {
        let postParams = {
            'access_token': access_token,
            'body_params': {
                "item": {
                    "id": fid,
                    "type": "folder"
                },
                "accessible_by": {
                    "type": "user"
                },
                "role": role || "editor"
            }
        };
        if (uid) {
            postParams.body_params.accessible_by.id = uid;
        } else if (login) {
            postParams.body_params.accessible_by.login = login;
        }
        return boxclient.collaborations.add(postParams);
    };

    exports.createPreviewLink = function(fid, access_token) {
        return boxclient.file.createPreviewLink({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            }
        });
    };

    exports.getThumbnail = function(fid, link, access_token) {
        let args = {
            'access_token': access_token,
            'path_params': {
                'fid': fid,
                'extension': 'png'
            }
        };
        if (link) {
            args.headers = {
                'BoxApi': 'shared_link=' + link
            };
        }
        return boxclient.file.getThumbnail(args);
    };

    exports.getFileInfo = function(fid, fields, access_token) {
        return boxclient.file.info({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            },
            'query_params': {
                'fields': fields
            }
        });
    };

    exports.getFolderItems = function(fid, fields, access_token) {
        return boxclient.folder.getItems({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            },
            'query_params': {
                'fields': fields
            }
        });
    };

    exports.searchMD = function(access_token) {
        return boxclient.search.get({
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
    };

    exports.getFolderMD = function(fid, tname, access_token) {
        return boxclient.folderMetadata.get({
            'access_token': access_token,
            'path_params': {
                'fid': fid,
                'scope': 'enterprise',
                'template': tname
            }
        });
    };

    exports.addFolderMD = function(fid, tname, tval, access_token) {
        return boxclient.folderMetadata.create({
            'access_token': access_token,
            'path_params': {
                'fid': fid,
                'scope': 'enterprise',
                'template': tname
            },
            'body_params': {
                'taskflowTemplateRefName': tval
            }
        });
    };

    exports.getFolderInfo = function(fid, fields, access_token) {
        return boxclient.folder.info({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            },
            'query_params': {
                'fields': fields
            }
        });
    };

    exports.getSharedItems = function(link, access_token) {
        return boxclient.sharedItems.get({
            'access_token': access_token,
            'headers': {
                'BoxApi': 'shared_link=' + link
            }
        });
    };

    exports.createSharedLink = function(fid, access_token) {
        return boxclient.file.createSharedLink({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            }
        });
    };
    exports.renameFolder = function(fid, name, access_token) {
        return boxclient.folder.rename({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            },
            'body_params': {
                'name': name
            }
        });
    };

    exports.copyFile = function(fid, pid, access_token) {
        return boxclient.file.copy({
            'access_token': access_token,
            'path_params': {
                'fid': fid
            },
            'body_params': {
                'parent': {
                    'id': pid
                }
            }
        });
    };

    exports.createFolder = function(name, pid, access_token) {
        return boxclient.folders.post({
            'access_token': access_token,
            'body_params': {
                "name": name,
                "parent": {
                    "id": pid || '0'
                }
            }
        });
    };

    exports.getUsers = function(filter, limit, offset, login, access_token) {
        let params = {
            'access_token': access_token,
            'query_params': {
                'fields': 'id,name,login,language,timezone,avatar_url,enterprise',
                'user_type': 'all',
                'filter_term': filter,
                'limit': limit || 100,
                'offset': offset || 0
            }
        };
        if (login) {
            params.query_params.filter_term = login;
            params.query_params.user_type = 'external';
        }
        return boxclient.users.get(params);
    };

    exports.refreshToken = function(refresh_token) {
        // boxclient.getRefreshedAuthToken(token);
        return boxclient.token.refresh({
            'body_params': {
                'refresh_token': refresh_token
            },
            'contentType': 'form'
        });
    };

    exports.getUserInfo = function(uid, fields, access_token) {
        return boxclient.user.info({
            'access_token': access_token,
            'path_params': {
                'uid': uid
            },
            'query_params': {
                'fields': fields || 'id,name,login,language,timezone,avatar_url,enterprise'
            }
        });
    };

    exports.createUser = function(name, login, access_token) {
        // requires server token
        return boxclient.users.create({
            'access_token': access_token,
            'body_params': {
                "name": yargs.name,
                "login": yargs.login
            }
        });
    };

    exports.createViewPath = function(fid, uid, role, access_token) {
        return boxclient.collaborations.add({
            'access_token': access_token,
            'body_params': {
                "item": {
                    "id": fid,
                    "type": "folder"
                },
                "accessible_by": {
                    "id": uid,
                    "type": "user"
                },
                "can_view_path": true,
                "role": role || "editor"
            }
        });
    };

    exports.requestAccessToken = function(code) {
        return boxclient.token.code({
            'body_params': {
                'code': code
            },
            'contentType': 'form'
        });
    };

    exports.createAppUser = function(name, access_token) {
        return boxclient.users.create({
            'access_token': access_token,
            'body_params': {
                "name": name,
                "is_platform_access_only": true
            }
        });
    };

    exports.initialAuthorize = function(redirect_uri, state) {
        return boxclient.authorize.get(redirect_uri || 'http://127.0.0.1', state);
    };

    exports.postAuthorize = function(redirect_uri, state, cookies) {
        let args = {
            'headers': {
                'Cookie': cookies
            },
            'query_params': {
                'redirect_uri': redirect_uri
            }
        };

        return boxclient.authorize.post(args);
    };
    exports.createMetadata = function(access_token, templateKey, templateName, fields, hidden) {
        let fieldsArray = [];
        try {
            fieldsArray = JSON.parse(fields);
        } catch (e) {
            winston.log('error', 'fields can not be parsed as an json array', fields);
            process.exit(1);
        }
        return boxclient.metadata.create({
            'access_token': access_token,
            'body_params': {
                "templateKey": templateKey,
                "displayName": templateName,
                "fields": fieldsArray,
                "hidden": !!hidden
            }
        });
    };


})();
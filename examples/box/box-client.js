(function() {
    'use strict';

    const config = require('../../lib/config.js'),
        Bluebird = require('bluebird'),
        fs = Bluebird.promisifyAll(require('fs')),
        winston = require('winston'),
        path = require('path'),
        utils = require('../../lib/utils.js'),
        RestApi = require('../../lib/rest-client.js');

    const BOX_API_HOST = config.BOX_API_BASE_URL,
        TOKEN_FILE = path.resolve('./', config.BOX_TOKEN_JSON_FILE),
        THUMBNAIL_FILE = path.resolve('./', 'thumbnail.png');

    let getBoxRestDefinition = function() {
        return {
            'token': {
                'endpoint': '/oauth2/token',
                'methods': [{
                    'id': 'code',
                    'method': 'POST',
                    'body_params': {
                        "grant_type": "authorization_code",
                        "client_id": config.BOX_CLIENT_ID,
                        "client_secret": config.BOX_CLIENT_SECRET
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
                        'client_id': config.BOX_CLIENT_ID,
                        'client_secret': config.BOX_CLIENT_SECRET
                    }
                }, {
                    'id': 'refresh',
                    'method': 'POST',
                    'body_params': {
                        "client_id": config.BOX_CLIENT_ID,
                        "client_secret": config.BOX_CLIENT_SECRET,
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


    let getBoxClient = function() {
        let jsonDefinitions = getBoxRestDefinition();
        return RestApi.getRestApi(BOX_API_HOST, jsonDefinitions, {
            'requestHandler': boxRequestHandler
        });
    };
    exports.getBoxClient = getBoxClient;

    let getOAuthURL = function() {
        let url = [
            config.BOX_OAUTH_BASE_URL,
            "/authorize?response_type=code&client_id=", 
            config.BOX_CLIENT_ID, 
            "&state=security_tokenDKnhMJatFipTAnM0nHlZA"
        ].join("");
        // always dump the oauth URL to the console
        console.log("info", url);
        return url;
    };
    exports.getOAuthURL = getOAuthURL;
})();

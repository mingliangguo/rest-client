'use strict';

const fs = require('fs'),
    jwt = require('jsonwebtoken'),
    logger = require('./../../lib/logger'),
    path = require('path'),
    utils = require('./../../lib/utils'),
    RestApi = require('./../../lib/restapi');

const THUMBNAIL_FILE = path.resolve('./', 'thumbnail.png');

module.exports = class BoxApi extends RestApi {
    /**
     *  Constructor of the BoxApi
     *  @options an object holds the configurations parameters for the BoxApi. Look at the config.yml for
     *  the box section to see what are the parameters.
     */
    constructor(options) {
        super('Box API', options.api.api_base_url, options);
    }

    setTokens(tokens) {
        this.access_token = tokens.access_token;
        this.refresh_token = tokens.refresh_token;
        utils.saveJsonAsFile(
            JSON.stringify(tokens),
            this.params.token_json_file
        );
    }

    getRestDefinition() {
        return {
            authorize: {
                baseUrl: this.api.api_base_url,
                endpoint: '/api/oauth2/authorize',
                methods: [
                    {
                        id: 'get',
                        method: 'GET',
                        query_params: {
                            response_type: 'code',
                            client_id: this.oauth_app.client_id
                        }
                    },
                    {
                        id: 'post',
                        method: 'POST',
                        query_params: {
                            response_type: 'code',
                            client_id: this.oauth_app.client_id
                        }
                    }
                ]
            },
            token: {
                endpoint: '/oauth2/token',
                methods: [
                    {
                        id: 'code',
                        method: 'POST',
                        body_params: {
                            grant_type: 'authorization_code',
                            client_id: this.oauth_app.client_id,
                            client_secret: this.oauth_app.client_secret
                        },
                        query_params: {},
                        callback: res => {
                            if (res.statusCode === 200) {
                                this.setTokens(JSON.parse(res.body));
                            }
                        }
                    },
                    {
                        id: 'server',
                        method: 'POST',
                        body_params: {
                            grant_type:
                                'urn:ietf:params:oauth:grant-type:jwt-bearer',
                            client_id: this.jwt_app.client_id,
                            client_secret: this.jwt_app.client_secret
                        },
                        callback: res => {
                            if (res && res.statusCode === 200) {
                                this.setTokens(JSON.parse(res.body));
                            }
                        }
                    },
                    {
                        id: 'refresh',
                        method: 'POST',
                        body_params: {
                            client_id: this.oauth_app.client_id,
                            client_secret: this.oauth_app.client_secret,
                            grant_type: 'refresh_token'
                        },
                        callback: res => {
                            if (res && res.statusCode === 200) {
                                this.setTokens(JSON.parse(res.body));
                            }
                        }
                    }
                ]
            },
            oauth: {
                endpoint: 'oauth',
                methods: [
                    {
                        id: 'get'
                    }
                ]
            },
            search: {
                endpoint: '/2.0/search/',
                methods: [
                    {
                        id: 'get'
                    }
                ]
            },
            folders: {
                endpoint: '/2.0/folders',
                methods: [
                    {
                        id: 'get'
                    },
                    {
                        id: 'post',
                        method: 'POST'
                    }
                ]
            },
            sharedItems: {
                endpoint: '/2.0/shared_items',
                methods: [
                    {
                        id: 'get'
                    }
                ]
            },
            folder: {
                endpoint: '/2.0/folders/:fid',
                methods: [
                    {
                        id: 'info',
                        mehtod: 'GET'
                    },
                    {
                        id: 'createSharedLink',
                        method: 'PUT',
                        body_params: {
                            shared_link: {
                                access: 'open'
                            }
                        }
                    },
                    {
                        id: 'rename',
                        method: 'PUT'
                    },
                    {
                        id: 'createPreviewLink',
                        method: 'GET',
                        query_params: {
                            fields: 'expiring_embed_link'
                        }
                    },
                    {
                        id: 'delete',
                        method: 'DELETE'
                    },
                    {
                        id: 'getItems',
                        path: '/items',
                        method: 'GET'
                    },
                    {
                        id: 'getCollab',
                        path: '/collaborations',
                        method: 'GET'
                    },
                    {
                        id: 'getMetadata',
                        path: '/metadata/:scope/:template',
                        method: 'GET'
                    },
                    {
                        id: 'createMetadata',
                        path: '/metadata/:scope/:template',
                        method: 'POST'
                    }
                ]
            },
            file: {
                endpoint: '/2.0/files/:fid',
                methods: [
                    {
                        id: 'info',
                        mehtod: 'GET'
                    },
                    {
                        id: 'delete',
                        method: 'DELETE'
                    },
                    {
                        id: 'createSharedLink',
                        method: 'POST',
                        body_params: {
                            shared_link: {
                                access: 'open'
                            }
                        }
                    },
                    {
                        id: 'copy',
                        path: '/copy',
                        method: 'POST',
                        body_params: {
                            parent: {
                                id: 'pid'
                            }
                        }
                    },
                    {
                        id: 'createPreviewLink',
                        method: 'GET',
                        query_params: {
                            fields: 'expiring_embed_link'
                        }
                    },
                    {
                        id: 'getThumbnail',
                        path: '/thumbnail.:extension',
                        method: 'GET',
                        binaryBody: true,
                        callback: function(res) {
                            utils.saveBinaryResponseAsFile(res, THUMBNAIL_FILE);
                        },
                        query_params: {
                            min_height: 128,
                            min_width: 128
                        }
                    }
                ]
            },
            collaborations: {
                endpoint: '/2.0/collaborations',
                methods: [
                    {
                        id: 'get'
                    },
                    {
                        id: 'add',
                        method: 'POST'
                    }
                ]
            },
            collaboration: {
                endpoint: '/2.0/collaborations/:cid',
                methods: [
                    {
                        id: 'get'
                    },
                    {
                        id: 'delete',
                        method: 'DELETE'
                    }
                ]
            },
            users: {
                endpoint: '/2.0/users',
                methods: [
                    {
                        id: 'get',
                        method: 'GET',
                        query_params: {
                            fields:
                                'name,login,language,role,timezone,enterprise'
                        }
                    },
                    {
                        id: 'create',
                        method: 'POST'
                    }
                ]
            },
            user: {
                endpoint: '/2.0/users/:uid',
                methods: [
                    {
                        id: 'info',
                        method: 'GET',
                        query_params: {
                            fields:
                                'name,login,language,role,timezone,enterprise'
                        }
                    }
                ]
            },
            batch: {
                endpoint: '/2.0/batch',
                methods: [
                    {
                        id: 'exec',
                        method: 'POST'
                    }
                ]
            },
            metadata: {
                endpoint: '/2.0/metadata_templates',
                methods: [
                    {
                        id: 'create',
                        method: 'POST',
                        path: '/schema',
                        body_params: {
                            scope: 'enterprise',
                            templateKey: '',
                            displayName: '',
                            fields: []
                        }
                    }
                ]
            }
        };
    }

    getRequestHandler(options, params) {
        if (this.access_token) {
            options.headers = utils.mixin(
                {
                    Authorization: 'Bearer ' + this.access_token
                },
                options.headers
            );
        } else {
            if (
                params &&
                params.endpoint !== '/oauth2/token' &&
                !params.server_token
            ) {
                throw new Error('No access_token found!!');
            }
        }

        return options;
    }

    shouldRetry(options, res, err) {
        if (!this.retryConfig || !this.retryConfig.enabled) {
            return false;
        }

        let retryOptions = options && options.__retryOptions;
        if (retryOptions && retryOptions.attempt === retryOptions.limit) {
            logger.log(
                'warn',
                `== retried request [${options.method} ${options.uri}] for [${retryOptions.attempt}] times and still no success, so give it up ...`
            );
            return false;
        }

        if (
            (res && res.statusCode === 429) ||
            (err &&
                // connection reset by peer
                (err.errno === 'ECONNRESET' ||
                    // connection refused
                    err.errno === 'ECONNREFUSED' ||
                    // software caused connection abort
                    err.errno === 'ECONNABORTED'))
        ) {
            return true;
        } else {
            return false;
        }
    }

    computeRetryWaitTime(options, res) {
        if (!this.retryConfig || !this.retryConfig.enabled) {
            throw new Error(
                `Retry is not enabled for [${options && options.uri}]`,
                options
            );
        }
        let retryOptions = options.__retryOptions;
        if (res && res.statusCode === 429) {
            let retryAfter =
                res.headers['retry-after'] * 1000 ||
                this.retryConfig.default_wait_time;
            retryOptions.wait_time = Math.min(
                retryAfter * Math.pow(2, retryOptions.attempt),
                this.retryConfig.max_wait_time
            );
        } else {
            retryOptions.wait_time = Math.min(
                this.retryConfig.default_wait_time *
                    Math.pow(2, retryOptions.attempt),
                this.retryConfig.max_wait_time
            );
        }
    }

    getResponseHandler(res, options, err) {
        if (res && res.statusCode === 401) {
            return this.getServerToken().then(() => this.retry(options, 10));
        }
        return this.shouldRetry(options, res, err) ? this.retry(options, options.__retryOptions.wait_time) : res;
    }

    getOAuthURL() {
        let url = [
            this.api.oauth_base_url,
            '/authorize?response_type=code&client_id=',
            this.oauth_app.client_id,
            '&state=security_tokenDKnhMJatFipTAnM0nHlZA'
        ].join('');
        // always dump the oauth URL to the console
        console.log('info', url);
        return url;
    }

    getFolderCollab(fid) {
        return this.agent.folder.getCollab({
            path_params: {
                fid: fid
            }
        });
    }

    getCollab(cid) {
        return this.agent.collaboration.get({
            path_params: {
                cid: cid
            }
        });
    }

    deleteCollab(cid) {
        return this.agent.collaboration.delete({
            path_params: {
                cid: cid
            }
        });
    }

    addCollab(fid, role, uid, login) {
        let postParams = {
            body_params: {
                item: {
                    id: fid,
                    type: 'folder'
                },
                accessible_by: {
                    type: 'user'
                },
                role: role || 'editor'
            }
        };
        if (uid) {
            postParams.body_params.accessible_by.id = uid;
        } else if (login) {
            postParams.body_params.accessible_by.login = login;
        }
        return this.agent.collaborations.add(postParams);
    }

    createPreviewLink(fid) {
        return this.agent.file.createPreviewLink({
            path_params: {
                fid: fid
            }
        });
    }

    getThumbnail(fid, link) {
        let args = {
            path_params: {
                fid: fid,
                extension: 'png'
            }
        };
        if (link) {
            args.headers = {
                BoxApi: 'shared_link=' + link
            };
        }
        return this.agent.file.getThumbnail(args);
    }

    getFileInfo(fid, fields) {
        return this.agent.file.info({
            path_params: {
                fid: fid
            },
            query_params: {
                fields: fields
            }
        });
    }

    getFolderItems(fid, fields) {
        return this.agent.folder.getItems({
            path_params: {
                fid: fid
            },
            query_params: {
                fields: fields,
                limit: 100
            }
        });
    }

    searchMD() {
        return this.agent.search.get({
            query_params: {
                type: 'folder',
                scope: 'enterprise_content',
                ancestor_folder_ids: '6887024810',
                mdfilters: JSON.stringify([
                    {
                        templateKey: 'IBM_TASKFLOW_METADATA_TEMPLATE_TEST',
                        scope: 'enterprise',
                        filters: {
                            taskflowTemplateRefName: 'greatTaskflow'
                        }
                    }
                ])
            }
        });
    }

    getFolderMD(fid, tname) {
        return this.agent.folderMetadata.get({
            path_params: {
                fid: fid,
                scope: 'enterprise',
                template: tname
            }
        });
    }

    addFolderMD(fid, tname, tval) {
        return this.agent.folderMetadata.create({
            path_params: {
                fid: fid,
                scope: 'enterprise',
                template: tname
            },
            body_params: {
                taskflowTemplateRefName: tval
            }
        });
    }

    getFolderInfo(fid, fields) {
        return this.agent.folder.info({
            path_params: {
                fid: fid
            },
            query_params: {
                fields: fields
            }
        });
    }

    getSharedItems(link) {
        return this.agent.sharedItems.get({
            headers: {
                BoxApi: 'shared_link=' + link
            }
        });
    }

    createSharedLink(fid) {
        return this.agent.file.createSharedLink({
            path_params: {
                fid: fid
            }
        });
    }

    renameFolder(fid, name) {
        return this.agent.folder.rename({
            path_params: {
                fid: fid
            },
            body_params: {
                name: name
            }
        });
    }

    deleteFile(fid) {
        return this.agent.file.delete({
            path_params: {
                fid: fid
            }
        });
    }

    deleteFolder(fid, recursive) {
        recursive = recursive || false;
        return this.agent.folder.delete({
            path_params: {
                fid: fid
            },
            query_params: {
                recursive: recursive
            }
        });
    }

    copyFile(fid, pid) {
        return this.agent.file.copy({
            path_params: {
                fid: fid
            },
            body_params: {
                parent: {
                    id: pid
                }
            }
        });
    }

    createFolder(name, pid) {
        return this.agent.folders.post({
            body_params: {
                name: name,
                parent: {
                    id: pid || '0'
                }
            }
        });
    }

    getUsers(filter, limit, offset, login, fields) {
        let params = {
            query_params: {
                fields:
                    fields ||
                    'id,name,login,role,language,timezone,avatar_url,enterprise',
                user_type: 'all',
                filter_term: filter,
                limit: limit || 100,
                offset: offset || 0
            }
        };
        if (login) {
            params.query_params.filter_term = login;
            // params.query_params.user_type = 'external';
        }
        return this.agent.users.get(params);
    }

    refreshToken(refresh_token) {
        refresh_token = refresh_token || this.refresh_token;
        if (!refresh_token) {
            throw new Error(
                '== No refresh token provided... operation aborted!! =='
            );
        }
        // this.api.getRefreshedAuthToken(token);
        return this.agent.token.refresh({
            body_params: {
                refresh_token: refresh_token
            },
            contentType: 'form'
        });
    }

    getUserInfo(uid, fields) {
        return this.agent.user.info({
            path_params: {
                uid: uid
            },
            query_params: {
                fields:
                    fields ||
                    'id,name,login,language,timezone,avatar_url,enterprise'
            }
        });
    }

    createUser(name, login) {
        // requires server token
        return this.agent.users.create({
            body_params: {
                name: name,
                login: login
            }
        });
    }

    createViewPath(fid, role, uid, login) {
        return this.agent.collaborations.add({
            body_params: {
                item: {
                    id: fid,
                    type: 'folder'
                },
                accessible_by: {
                    id: uid,
                    login: login,
                    type: 'user'
                },
                can_view_path: true,
                role: role || 'editor'
            }
        });
    }

    requestAccessToken(code) {
        return this.agent.token
            .code({
                body_params: {
                    code: code
                },
                contentType: 'form'
            })
            .then(res => {
                if (res.statusCode !== 200) {
                    throw new Error(
                        `Request access token failed with code: [${res.statusCode}], and body: [${res.body}]`
                    );
                }
                return res;
            });
    }

    createAppUser(name) {
        return this.agent.users.create({
            body_params: {
                name: name,
                is_platform_access_only: true
            }
        });
    }

    initialAuthorize(redirect_uri, state) {
        return this.agent.authorize.get(
            redirect_uri || 'http://127.0.0.1',
            state
        );
    }

    postAuthorize(redirect_uri, state, cookies) {
        let args = {
            headers: {
                Cookie: cookies
            },
            query_params: {
                redirect_uri: redirect_uri
            }
        };

        return this.agent.authorize.post(args);
    }

    createMetadata(templateKey, templateName, fields, hidden) {
        let fieldsArray = [];
        try {
            fieldsArray = JSON.parse(fields);
        } catch (e) {
            logger.log(
                'error',
                'fields can not be parsed as an json array',
                fields
            );
            process.exit(1);
        }
        return this.agent.metadata.create({
            body_params: {
                templateKey: templateKey,
                displayName: templateName,
                fields: fieldsArray,
                hidden: !!hidden
            }
        });
    }

    batchUsers(uids) {
        let userGetArray = uids.map(uid => {
            return {
                method: 'GET',
                relative_url: `/users/${uid}?fields=login,status`
            };
        });
        return this.agent.batch.exec({
            body_params: {
                requests: userGetArray
            }
        });
    }
    batchAddCollaboration(fid, uids, role = 'editor') {
        let createCollabArray = uids.map(uid => {
            return {
                method: 'POST',
                relative_url: '/collaborations',
                body: {
                    item: {
                        id: `${fid}`,
                        type: 'folder'
                    },
                    accessible_by: {
                        id: `${uid}`,
                        type: 'user',
                        login: null
                    },
                    role: role || 'previewer',
                    can_view_path: true
                }
            };
        });
        return this.agent.batch.exec({
            body_params: {
                requests: createCollabArray
            }
        });
    }

    getServerToken() {
        const claims = {
            iss: this.jwt_app.client_id,
            sub: `${this.jwt_app.enterprise.id}`,
            aud: this.api.oauth_jwt_aud,
            jti: 'abcM4yeY3W63TxHa9jFek85def' + Math.random(), //jti has to be between 16 and 128.
            box_sub_type: this.api.oauth_jwt_sub_type
        };

        logger.log('debug', 'jwt claims => ', claims);

        // sign with RSA SHA256
        if (!fs.existsSync(this.jwt_app.private_key_file)) {
            // if the key file doesn't exist, throw exceptions
            throw new Error(
                `The key file[${this.jwt_app.private_key_file}] doesn't exist`
            );
        }
        const cert = fs.readFileSync(this.jwt_app.private_key_file); // get private key

        const token = jwt.sign(
            claims,
            {
                key: cert,
                passphrase: this.jwt_app.key_passphrase
            },
            {
                algorithm: 'RS256',
                typ: 'jwt',
                expiresIn: 60
            }
        );
        logger.log('debug', '===> jwt token is:', token);
        return this.agent.token
            .server({
                body_params: {
                    client_id: this.jwt_app.client_id,
                    client_secret: this.jwt_app.client_secret,
                    assertion: token,
                    grant_type: this.api.oauth_jwt_grant_type
                },
                contentType: 'form',
                server_token: true
            })
            .then(res => {
                if (res && res.statusCode === 200) {
                    this.setTokens(JSON.parse(res.body));
                } else {
                    throw new Error(
                        `Error occured during requesting server token for [${claims.sub}], the response status code is [${res.statusCode}], and the response body is [${res.body}]. And the jwt_assertion is [${token}]`
                    );
                }
                return res;
            });
    }
};

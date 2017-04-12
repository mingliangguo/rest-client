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

    const github_base_url = config.github.api.github_base_url,
        access_token = config.github.app.token;

    let getGithubRestDefinition = function() {
        return {
            'orgs': {
                'baseUrl': github_base_url,
                'endpoint': '/orgs',
                'methods': [{
                        'id': 'getOrg',
                        'path': '/:orgId',
                        'method': 'GET'
                    },
                    {
                        'id': 'getOrgRepos',
                        'path': '/:orgId/repos',
                        'method': 'GET'
                    }
                ]
            },
            'repos': {
                'baseUrl': github_base_url,
                'endpoint': '/repos',
                'methods': [{
                        'id': 'getRepo',
                        'path': '/:orgId/:repoId',
                        'method': 'GET'
                    },
                    {
                        'id': 'getIssues',
                        'path': '/:orgId/:repoId/issues',
                        'method': 'GET'
                    },
                    {
                        'id': 'createIssue',
                        'path': '/:orgId/:repoId/issues',
                        'method': 'POST'
                    }
                ]
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
    let ghRequestHandler = function(options, params) {
        if (access_token) {
            options.headers = utils.mixin({
                "Authorization": 'token ' + access_token
            }, options.headers);
        }

        return options;
    };

    const ghclient = RestApi.getRestApi(config.github.api.api_base_url, getGithubRestDefinition(), {
        'requestHandler': ghRequestHandler
    });

    exports.getGithubClient = function() {
        return ghclient;
    };

    exports.getOrg = function(oid) {
        return ghclient.orgs.getOrg({
            'path_params': {
                'orgId': oid
            }
        });
    };
    exports.getOrgRepos = function(oid) {
        return ghclient.orgs.getOrgRepos({
            'path_params': {
                'orgId': oid
            }
        });
    };
})();
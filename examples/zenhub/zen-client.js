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

    const zenhub_base_url = config.zenhub.api.api_base_url,
        access_token = config.zenhub.app.token;

    let getZenhubRestDefinition = function() {
        return {
            'repositories': {
                'baseUrl': zenhub_base_url,
                'endpoint': '/repositories',
                'methods': [{
                    'id': 'issues',
                    'path': '/:repo_id/issues',
                    'method': 'GET',
                }, {
                    'id': 'issue',
                    'method': 'GET',
                    'path': '/:repo_id/issues/:issue_number'
                }, {
                    'id': 'epics',
                    'path': '/:repo_id/epics',
                    'method': 'GET'
                }, {
                    'id': 'epic',
                    'path': '/:repo_id/epics/:epic_id',
                    'method': 'GET'
                }, {
                    'id': 'board',
                    'path': '/:repo_id/board',
                    'method': 'GET'
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
    let zenHubRequestHandler = function(options, params) {
        if (access_token) {
            options.headers = utils.mixin({
                "X-Authentication-Token": access_token
            }, options.headers);
        }

        return options;
    };

    const zenclient = RestApi.getRestApi(config.zenhub.api.api_base_url, getZenhubRestDefinition(), {
        'requestHandler': zenHubRequestHandler
    });

    exports.getZenhubClient = function() {
        return zenclient;
    };

    exports.getIssues = function(rid) {
        return zenclient.repositories.issues({
            'path_params': {
                'repo_id': rid
            }
        });
    };

    exports.getIssue = function(rid, iid) {
        return zenclient.repositories.issue({
            'path_params': {
                'repo_id': rid,
                'issue_number': iid
            }
        });
    };

    exports.getEpics = function(rid) {
        return zenclient.repositories.epics({
            'path_params': {
                'repo_id': rid
            }
        });
    };

    exports.getEpic = function(rid, eid) {
        return zenclient.repositories.issues({
            'path_params': {
                'repo_id': rid,
                'epic_id': eid
            }
        });
    };

})();
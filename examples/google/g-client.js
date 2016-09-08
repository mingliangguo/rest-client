(function() {
    'use strict';

    // Google calendar API reference
    // https://developers.google.com/google-apps/calendar/v3/reference/

    let querystring = require('querystring'),
        config = require('../../lib/config.js'),
        Promise = require('bluebird'),
        path = require('path'),
        fs = Promise.promisifyAll(require('fs')),
        RestApi = require('../../lib/rest-client.js'),
        utils = require('../../lib/utils.js');

    let gc_client = {};
    module.exports = gc_client;

    const TOKEN_FILE = path.resolve('./', config.GOOGLE_TOKEN_JSON_FILE);

    let getRestDefinition = function() {
        return {
            'token': {
                'endpoint': '/oauth2/v4/token',
                'methods': [{
                    'id': 'code',
                    'method': 'POST',
                    'body_params': {
                        "grant_type": "authorization_code",
                        "client_id": config.GOOGLE_CLIENT_ID,
                        "redirect_uri": config.GOOGLE_OAUTH_REDIRECT_URL,
                        "client_secret": config.GOOGLE_CLIENT_SECRET
                    },
                    'callback': function(res) {
                        utils.updateJsonFile(res.body, TOKEN_FILE);
                    }
                }, {
                    'id': 'refresh',
                    'method': 'POST',
                    'body_params': {
                        "client_id": config.GOOGLE_CLIENT_ID,
                        "client_secret": config.GOOGLE_CLIENT_SECRET,
                        "grant_type": "refresh_token"
                    },
                    'callback': function(res) {
                        utils.updateJsonFile(res.body, TOKEN_FILE);
                    }
                }]
            },
            'clist': {
                'endpoint': '/calendar/v3/users/me/calendarList',
                'methods': [{
                    'id': 'get',
                    'method': 'GET'
                }]
            },
            'events': {
                'endpoint': '/calendar/v3/calendars/:cid/events',
                'methods': [{
                    'id': 'get',
                    'method': 'GET'
                }]
            }
        };
    };

    /**
     * request handler.
     */
    let requestHandler = function(options, params) {
        let access_token = params.access_token;

        if (access_token) {
            options.headers = utils.mixin({
                "Authorization": "Bearer " + access_token
            }, options.headers);
        }

        return options;
    };

    gc_client.getOAuthURL = function() {
        return [config.GOOGLE_OAUTH_BASE_URL,
            '?',
            'scope=',
            config.GOOGLE_OAUTH_SCOPE,
            '&',
            'state=%2Fprofile&',
            'redirect_uri=',
            config.GOOGLE_OAUTH_REDIRECT_URL,
            '&',
            'response_type=code&',
            'client_id=',
            config.GOOGLE_CLIENT_ID,
            '&',
            'access_type=offline&', // to get the refresh_token in the response.
            'nonce=kefjpaykenmfneq' + Math.random()
        ].join('');
    };

    gc_client.getRestClient = function() {
        let jsonDefinitions = getRestDefinition();
        return RestApi.getRestApi(config.GOOGLE_API_BASE_URL, jsonDefinitions, {
            requestHandler: requestHandler
        });
    };
})();

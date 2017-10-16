(function() {
    'use strict';

    // Google calendar API reference
    // https://developers.google.com/google-apps/calendar/v3/reference/

    let querystring = require('querystring'),
        fs = Bluebird.promisifyAll(require('fs')),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
        Promise = require('bluebird'),
        path = require('path'),
        RestApi = require('../../lib/rest-client.js'),
        utils = require('../../lib/utils.js');

    const GOOGLE_CLIENT_ID = config.google.app.client_id,
        GOOGLE_CLIENT_SECRET = config.google.app.client_secret;

    let gc_client = {};
    module.exports = gc_client;

    const TOKEN_FILE = path.resolve('./', config.google.config.token_json_file);

    let getRestDefinition = function() {
        return {
            'token': {
                'endpoint': '/oauth2/v4/token',
                'methods': [{
                    'id': 'code',
                    'method': 'POST',
                    'body_params': {
                        "grant_type": "authorization_code",
                        "client_id": GOOGLE_CLIENT_ID,
                        "redirect_uri": config.google.api.OAUTH_REDIRECT_URL,
                        "client_secret": GOOGLE_CLIENT_SECRET
                    },
                    'callback': function(res) {
                        utils.updateJsonFile(res.body, TOKEN_FILE);
                    }
                }, {
                    'id': 'refresh',
                    'method': 'POST',
                    'body_params': {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
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
        return [config.google.api.oauth_base_url,
            '?',
            'scope=',
            config.google.app.oauth_scope,
            '&',
            'state=%2Fprofile&',
            'redirect_uri=',
            config.google.app.oauth_redirect_url,
            '&',
            'response_type=code&',
            'client_id=',
            GOOGLE_CLIENT_ID,
            '&',
            'access_type=offline&', // to get the refresh_token in the response.
            'nonce=kefjpaykenmfneq' + Math.random()
        ].join('');
    };

    gc_client.getRestClient = function() {
        let jsonDefinitions = getRestDefinition();
        return RestApi.getRestApi(config.google.api.api_base_url, jsonDefinitions, {
            requestHandler: requestHandler
        });
    };
})();
'use strict';

// Google calendar API reference
// https://developers.google.com/google-apps/calendar/v3/reference/

let config = require('./../../lib/config'),
    path = require('path'),
    RestApi = require('../../lib/restapi'),
    utils = require('../../lib/utils');

const GOOGLE_CLIENT_ID = config.google.app.client_id,
    GOOGLE_CLIENT_SECRET = config.google.app.client_secret;

const TOKEN_FILE = path.resolve('./', config.google.config.token_json_file);

module.exports = class GoogleClient extends RestApi {
    constructor(options) {
        super('Box API', options.api.api_base_url, options);
    }
    getRestDefinition() {
        return {
            token: {
                endpoint: '/oauth2/v4/token',
                methods: [
                    {
                        id: 'code',
                        method: 'POST',
                        body_params: {
                            grant_type: 'authorization_code',
                            client_id: GOOGLE_CLIENT_ID,
                            redirect_uri: config.google.api.OAUTH_REDIRECT_URL,
                            client_secret: GOOGLE_CLIENT_SECRET
                        },
                        callback: function(res) {
                            utils.updateJsonFile(res.body, TOKEN_FILE);
                        }
                    },
                    {
                        id: 'refresh',
                        method: 'POST',
                        body_params: {
                            client_id: GOOGLE_CLIENT_ID,
                            client_secret: GOOGLE_CLIENT_SECRET,
                            grant_type: 'refresh_token'
                        },
                        callback: function(res) {
                            utils.updateJsonFile(res.body, TOKEN_FILE);
                        }
                    }
                ]
            },
            clist: {
                endpoint: '/calendar/v3/users/me/calendarList',
                methods: [
                    {
                        id: 'get',
                        method: 'GET'
                    }
                ]
            },
            events: {
                endpoint: '/calendar/v3/calendars/:cid/events',
                methods: [
                    {
                        id: 'get',
                        method: 'GET'
                    }
                ]
            }
        };
    }

    /**
     * request handler.
     */
    getRequestHandler(options, params) {
        let access_token = params.access_token;

        if (access_token) {
            options.headers = utils.mixin(
                {
                    Authorization: 'Bearer ' + access_token
                },
                options.headers
            );
        }

        return options;
    }

    getOAuthURL() {
        return [
            config.google.api.oauth_base_url,
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
    }
};

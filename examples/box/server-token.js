(function() {
    'use strict';

    // sign with default (HMAC SHA256)
    const jwt = require('jsonwebtoken'), 
        winston = require('winston'),
        config = require('../../lib/config.js'),
        boxclient = require('./box-client.js').getBoxClient(),
        fs = require("fs");

    const BOX_SUB_TYPE = "enterprise";
    const getServerToken = function(callback) {
        const claims = {
            "iss": config.BOX_CLIENT_ID,
            "sub": config.BOX_ENTERPRISE_ID,
            "aud": config.BOX_SERVER_TOKEN_AUD,
            'jti': 'abcM4yeY3W63TxHa9jFek85def' + Math.random(), //jti has to be between 16 and 128.
            "box_sub_type": BOX_SUB_TYPE
        };

        // sign with RSA SHA256
        const cert = fs.readFileSync(config.PRIVATE_KEY_FILE);  // get private key

        const token = jwt.sign(claims, {key: cert, passphrase: config.KEY_PASSPHRASE}, { algorithm: 'RS256', typ: 'jwt', 'expiresIn': 60});
        winston.log('debug', '===> jwt token is:', token);
        boxclient.token.server({
            'body_params': {
                client_id: config.BOX_CLIENT_ID,
                client_secret: config.BOX_CLIENT_SECRET,
                assertion: token,
                grant_type: config.BOX_SERVER_TOKEN_GRANT_TYPE
            },
            'contentType': 'form',
            'callback': callback
        });
    };
    exports.getServerToken = getServerToken;
})();

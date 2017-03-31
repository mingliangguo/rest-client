(function() {
    'use strict';

    // sign with default (HMAC SHA256)
    const jwt = require('jsonwebtoken'),
        winston = require('winston'),
        fs = require("fs"),
        yaml = require('js-yaml'),
        config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
        boxclient = require('./box-client.js').getBoxClient();

    const BOX_SUB_TYPE = "enterprise";
    const getServerToken = function(callback) {
        const claims = {
            "iss": config.box.app.client_id,
            "sub": config.box.enterprise.id + "",
            "aud": config.box.api.server_token_aud,
            "jti": 'abcM4yeY3W63TxHa9jFek85def' + Math.random(), //jti has to be between 16 and 128.
            "box_sub_type": config.box.api.server_token_sub_type
        };

        // sign with RSA SHA256
        const cert = fs.readFileSync(config.box.app.private_key_file); // get private key

        const token = jwt.sign(claims, { key: cert, passphrase: config.box.app.key_passphrase }, { algorithm: 'RS256', typ: 'jwt', 'expiresIn': 60 });
        winston.log('debug', '===> jwt token is:', token);
        boxclient.token.server({
            'body_params': {
                client_id: config.box.app.client_id,
                client_secret: config.box.app.client_secret,
                assertion: token,
                grant_type: config.box.api.server_token_grant_type
            },
            'contentType': 'form',
            'callback': callback
        });
    };
    exports.getServerToken = getServerToken;
})();
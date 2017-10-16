'use strict';

const request = require('./../../lib/timed-request'),
    setCookie = require('set-cookie-parser'),
    cheerio = require('cheerio'),
    logger = require('./../../lib/logger'),
    querystring = require('querystring'),
    user_agent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.0 Safari/537.36';

let combineCookies = (response, cookieMap) => {
    setCookie
        .parse(response, {
            decodeValues: true // default: true
            // }).filter(cookie => {
            //     return cookie.domain.endsWith('box.com');
        })
        .forEach(cookie => {
            cookieMap[cookie.name] = cookie.name + '=' + cookie.value;
        });
};

let buildCookieHeader = (cookieMap, filters) => {
    cookieMap = cookieMap || {};
    return Object.keys(cookieMap)
        .filter(key => {
            if (!filters) return true;
            return filters.indexOf(key) !== -1;
        })
        .map(key => {
            return cookieMap[key];
        })
        .join('; ');
};

logger.log(
    'debug',
    '------- Begin to make Initial GET call to authorize URL ----------'
);

module.exports = (request_url, login, password, proxied_url) => {
    let cookieMap = {},
        box_login_form = {
            login: login,
            password: password
        },
        // redirect url to box oauth
        redirect_to_box_oauth = '',
        authorize_redirect_url = '';

    return request({
        method: 'GET',
        uri: proxied_url || request_url,
        resolveWithFullResponse: true,
        simple: false
    })
        .then(response => {
            logger.log('debug', '------- Initial GET Authorize ------');
            logger.log('debug', response.statusCode);

            combineCookies(response, cookieMap);

            let oauth_body = cheerio.load(response.body);
            oauth_body(
                'input[type="hidden"]',
                'form.login_form'
            ).each((i, node) => {
                box_login_form[node.attribs.name] = node.attribs.value;
            });

            redirect_to_box_oauth = response.request.href;
            let cookieHeader = buildCookieHeader(cookieMap);
            logger.log('debug', `cookieHeade is ${cookieHeader}`);
            logger.log(
                'debug',
                '------- Begin to make POST call to authorize URL ----------'
            );
            logger.log('debug', 'box login form', box_login_form);
            return request({
                uri: redirect_to_box_oauth,
                method: 'POST',
                resolveWithFullResponse: true,
                simple: false,
                form: box_login_form,
                headers: {
                    Cookie: cookieHeader,
                    'User-Agent': user_agent
                }
            });
        })
        .then(response => {
            logger.log('debug', '---- After POST Authorize -------');
            logger.log('debug', response.statusCode);

            combineCookies(response, cookieMap);

            if (response.statusCode !== 302)
                throw new Error(
                    `expect 302 to be returned, but ${response.statusCode} is received!! `
                );

            authorize_redirect_url = response.headers['location'];

            let cookieHeader = buildCookieHeader(cookieMap, [
                'box_visitor_id',
                'site_preference',
                'z'
            ]);
            logger.log(
                'debug',
                `authorize_redirect_url get url is: ${authorize_redirect_url}`
            );
            logger.log('debug', `cookieHeade is ${cookieHeader}`);

            return request({
                method: 'GET',
                uri: authorize_redirect_url,
                resolveWithFullResponse: true,
                followRedirect: false,
                simple: false,
                headers: {
                    Cookie: cookieHeader,
                    'User-Agent': `${user_agent}`
                }
            });
        })
        .then(response => {
            logger.log('debug', response.statusCode);
            if (response.statusCode === 302) {
                logger.log('debug', response.headers['location']);
            }

            let redirect_uri = response.headers['location'];

            logger.log(
                'debug',
                `------ GET redirect URL:[${redirect_uri}], cookieMap [${cookieMap}] -------`
            );

            let params = querystring.parse(
                redirect_uri.substring(redirect_uri.indexOf('?') + 1)
            );

            return {
                oauth_code: params.code,
                redirect_uri: redirect_uri,
                cookies: cookieMap
            };
        })
        .catch(err => {
            logger.log(
                'error',
                'request application tokens failed with error',
                err
            );
            throw new Error(
                `Something wrong during login into the application - [${request_url}], with error => [${JSON.stringify(
                    err
                )}]`
            );
        });
};

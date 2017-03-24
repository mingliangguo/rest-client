(function() {
    'use strict';

    const utils = require('./utils.js'),
        winston = require('winston'),
        querystring = require('querystring'),
        request = require('request-promise');

    winston.level = process.env.LOG_LEVEL || "info";
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, { 'timestamp': true });
    /**
     * Common request handler.
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
     *    'callback': callbackFunc
     * }
     * </Pre>
     */
    let commonRestHandler = function(baseUrl, params, handlers) {
        let reqHandler = handlers && handlers.requestHandler,
            respHandler = handlers && handlers.responseHander;

        let method = params.method || 'GET',
            endpoint = params.endpoint,
            path_params = params.path_params,
            query_params = params.query_params,
            body_params = params.body_params,
            headers = params.headers,
            contentType = params.contentType,
            callback = params.callback;

        // replace path params
        endpoint = utils.replacePathParams(endpoint, path_params);

        let options = {
            method: method,
            headers: headers || {},
            encoding: params.encoding,
            followAllRedirects: false,
            followRedirect: false,
            simple: false,
            resolveWithFullResponse: true
        };

        if (contentType == 'form' && body_params && typeof body_params === 'object') {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = querystring.stringify(body_params);
        }
        // for json
        else {
            if (body_params) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body_params);
            }
        }

        if (query_params) {
            options.uri = [baseUrl, endpoint, '?', querystring.stringify(query_params)].join('');
        } else {
            options.uri = [baseUrl, endpoint].join('');
        }

        winston.log("debug", "====> Begin to dump request options:");
        winston.log("debug", JSON.stringify(options));
        winston.log("debug", "====> End of request options.");

        if (reqHandler) {
            winston.log("debug", "===> Begin to apply request handler");
            options = reqHandler(options, params) || options;
            winston.log("debug", "===> after apply request handler");
            winston.log("debug", JSON.stringify(options));
            winston.log("debug", "====> End of request options after request handler.");
        }

        let defaultResponseHandler = function(res) {
            console.timeEnd("request recorder");

            console.time("process response started");
            winston.log("info", '==> dump response body:\n', res.body);
            winston.log("info", "====> Begin to dump response:");
            winston.log("info", '==> response status code is:', res.statusCode);
            Object.keys(res.headers).forEach(header => {
                winston.log("debug", "==> header:", header, "=", res.headers[header]);
            });

            callback = callback || ((res) => {
                winston.log("info", '==> enter response callback:\n');
            });

            callback && callback(res);

            winston.log("info", "====> End of dump response");
            console.timeEnd("process response started");
            return res;
        };

        let responseHander = respHandler || defaultResponseHandler;

        console.time("request recorder");
        return request(options).then(responseHander);
    };

    /**
     * @param restJsonDef
     *          joson definition of the REST protocol
     * @param handlers
     *          object that holds the custom handlers provided to handle the rest response.
     *          There are two custom handlers can be provided: requestHandler and responseHandler
     *          requestHandler can be used to update the options object passed to request object, e.g. add additional request headers, etc.
     *          responseHander can be used to handle the response specifically
     */
    let getRestApi = function(baseUrl, restJsonDef, handlers) {
        let api = {};
        Object.keys(restJsonDef).forEach(key => {
            let restDef = restJsonDef[key];
            let contentType = restDef.contentType || 'application/json';
            api[key] = {};
            let methods = restDef.methods;
            if (methods) {
                methods.forEach(methodDef => {
                    api[key][methodDef.id] = function(options, callback) {
                        options = options || {};
                        options.body_params = utils.mixin(methodDef.body_params, options.body_params);
                        options.query_params = utils.mixin(methodDef.query_params, options.query_params);
                        options.path_params = utils.mixin(restDef.path_params, options.path_params);
                        options.method = methodDef.method || 'GET';
                        options.callback = callback || options.callback || methodDef.callback;
                        options.endpoint = restDef.endpoint + (methodDef.path || '');

                        // support binary content
                        options.encoding = methodDef.binaryBody ? null : undefined;

                        // common handler
                        return commonRestHandler(baseUrl, options, handlers);
                    };
                });
            }
        });
        return api;
    };
    exports.getRestApi = getRestApi;
})();
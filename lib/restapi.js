'use strict';

const utils = require('./utils'),
    logger = require('./logger'),
    querystring = require('querystring'),
    request = require('./timed-request');

// default retry wait time to be 100ms
const DEFAULT_RETRY_WAIT_TIME = 100;
module.exports = class RestAPI {
    constructor(name, baseUrl, options) {
        this.name = name;
        this.baseUrl = baseUrl;
        this.defaultTimeout = options && options.defaultTimeout;

        Object.assign(this, options);

        // internal tracker to track all requests being made by this API instance
        this.__tracker = [];

        this.agent = this.getApi(this.name, this.getRestDefinition());
    }

    getTrackingData() {
        return this.__tracker;
    }

    resetTracker() {
        this.__tracker = [];
    }

    /**
     * Template method for specific logic from different api
     */
    shouldRetry(options, res, err) {
        return this.retryEnabled && res.statusCode === 429;
    }

    retry(options, wait_time = DEFAULT_RETRY_WAIT_TIME) {
        logger.log(
            'info',
            `== Wait for [${wait_time /
                1000.0}]s before retry request [${options.uri}]`
        );
        return utils
            .delay(wait_time)
            .then(() => {
                return request(options, this.__tracker).then(res => {
                    return this.handleResponse(res, options);
                });
            })
            .catch(err => {
                return this.handleResponse(undefined, options, err);
            });
    }

    /**
     * @param restJsonDef
     *          joson definition of the REST protocol
     * @param handlers
     *          object that holds the custom handlers provided to handle the rest response.
     *          There are two custom handlers can be provided: requestHandler and responseHandler
     *          requestHandler can be used to update the options object passed to request object, e.g. add additional request headers, etc.
     *          responseHander can be used to handle the response specifically
     */
    getApi(name, restJsonDef) {
        let api = {};

        Object.keys(restJsonDef).forEach(key => {
            let restDef = restJsonDef[key];
            api[key] = {};
            restDef.methods &&
                restDef.methods.forEach(methodDef => {
                    api[key][methodDef.id] = (options, callback) => {
                        options = options || {};
                        options.body_params = utils.mixin(
                            methodDef.body_params,
                            options.body_params,
                            true
                        );
                        options.query_params = utils.mixin(
                            methodDef.query_params,
                            options.query_params,
                            true
                        );
                        options.path_params = utils.mixin(
                            restDef.path_params,
                            options.path_params,
                            true
                        );
                        options.method = methodDef.method || 'GET';
                        options.callback =
                            callback || options.callback || methodDef.callback;
                        options.endpoint =
                            restDef.endpoint + (methodDef.path || '');

                        // support binary content
                        options.encoding = methodDef.binaryBody
                            ? null
                            : undefined;

                        // default handler
                        return this.defaultRestHandler(options);
                    };
                });
        });
        return api;
    }

    /**
     *  Template method to compute the wait time for next retry
     * @param {object} res response of the previous request
     */
    computeRetryWaitTime(options, res, err) {
        return 100;
    }

    handleResponse(res, options, err) {
        // invoke registered callback if any
        options.__original_params__.callback &&
            options.__original_params__.callback.apply(this, [res]);

        if (this.shouldRetry(options, res)) {
            options.__retryOptions = options.__retryOptions || {
                wait_time: this.retryConfig.default_wait_time,
                attempt: 0,
                limit: this.retryConfig.limit
            };

            options.__retryOptions.attempt++;

            this.computeRetryWaitTime(options, res, err);
            return this.retry(options, options.__retryOptions.wait_time);
        } else {
            return (
                (this.getResponseHandler &&
                    this.getResponseHandler(res, options, err)) ||
                res
            );
        }
    }

    /**
     * default request handler.
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
    defaultRestHandler(params) {
        let method = params.method || 'GET',
            endpoint = params.endpoint,
            path_params = params.path_params,
            query_params = params.query_params,
            body_params = params.body_params,
            headers = params.headers,
            contentType = params.contentType;

        // replace path params
        endpoint = utils.replacePathParams(endpoint, path_params);

        let options = {
            method: method,
            headers: headers || {},
            encoding: params.encoding,
            followAllRedirects: false,
            followRedirect: false,
            simple: false,
            timeout: this.defaultTimeout || 0,
            __original_params__: params,
            resolveWithFullResponse: true
        };

        if (
            contentType === 'form' &&
            body_params &&
            typeof body_params === 'object'
        ) {
            options.headers['Content-Type'] =
                'application/x-www-form-urlencoded';
            options.body = querystring.stringify(body_params);
        } else {
            // for json
            if (body_params) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body_params);
            }
        }

        if (query_params && Object.keys(query_params).length > 0) {
            options.uri = [
                this.baseUrl,
                endpoint,
                '?',
                querystring.stringify(query_params)
            ].join('');
        } else {
            options.uri = [this.baseUrl, endpoint].join('');
        }

        options =
            (this.getRequestHandler &&
                this.getRequestHandler(options, params)) ||
            options;

        return request(options, this.__tracker)
            .then(res => {
                return this.handleResponse(res, options);
            })
            .catch(err => {
                logger.log(
                    'error',
                    `error occured during in request[${options.uri}], with error[${err.message}]`
                );
                return this.handleResponse(undefined, options, err);
            });
    }
};

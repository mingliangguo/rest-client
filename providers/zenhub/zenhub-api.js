'use strict';

const utils = require('./../../lib/utils'),
    config = require('./../../lib/config'),
    RestApi = require('./../../lib/restapi'),
    objectPath = require('object-path'),
    logger = require('./../../lib/logger');

const zenhub_token = utils.replaceEnvVariable(config.zenhub.app.token);

const zenhub_base_url = config.zenhub.api.base_url,
    rateConfig = objectPath.get(config, 'zenhub.api.rate');

// rate limit status
let zen_rate_limit = {};

const delay_duration = (rateConfig && rateConfig.period) || 5000;

module.exports = class ZenHubApi extends RestApi {
    constructor(name = 'Zenhub API', baseUrl = zenhub_base_url) {
        super(name, baseUrl);
    }
    getRestDefinition() {
        return {
            repositories: {
                endpoint: '/repositories',
                methods: [
                    {
                        id: 'getIssues',
                        path: '/:repo_id/issues',
                        method: 'GET'
                    },
                    {
                        id: 'getIssue',
                        method: 'GET',
                        path: '/:repo_id/issues/:issue_number'
                    },
                    {
                        id: 'moveIssue',
                        method: 'POST',
                        path: '/:repo_id/issues/:issue_number/moves'
                    },
                    {
                        id: 'getEpics',
                        path: '/:repo_id/epics',
                        method: 'GET'
                    },
                    {
                        id: 'getEpic',
                        path: '/:repo_id/epics/:epic_id',
                        method: 'GET'
                    },
                    {
                        id: 'updateEpicIssues',
                        path: '/:repo_id/epics/:epic_id/update_issues',
                        method: 'POST'
                    },
                    {
                        id: 'convertToEpic',
                        path: '/:repo_id/issues/:issue_number/convert_to_epic',
                        method: 'POST'
                    },
                    {
                        id: 'convertToIssue',
                        path: '/:repo_id/epics/:epic_id/convert_to_issue',
                        method: 'POST'
                    },
                    {
                        id: 'getBoard',
                        path: '/:repo_id/board',
                        method: 'GET'
                    }
                ]
            }
        };
    }

    getRequestHandler(options, params) {
        options.headers = utils.mixin(
            {
                'X-Authentication-Token': zenhub_token
            },
            options.headers
        );

        delete options.delay;

        if (
            zen_rate_limit.limit > 0 &&
            zen_rate_limit.limit === zen_rate_limit.used
        ) {
            options.delay = zen_rate_limit.reset;
        }

        return options;
    }

    getResponseHandler(options, res, err) {
        logger.log('debug', '====> Enter rateLimitResponseHandler:');
        let retry = false;

        if (!res && err) {
            retry = true;
        } else {
            zen_rate_limit.limit = parseInt(
                res.headers['x-ratelimit-limit'],
                10
            );
            zen_rate_limit.reset = parseInt(
                res.headers['x-ratelimit-reset'],
                10
            );
            zen_rate_limit.used = parseInt(res.headers['x-ratelimit-used'], 10);

            logger.log(
                'verbose',
                `Zenhub API Rate limit has used - [${zen_rate_limit.used}], requested uri[${res
                    .request.href}]`
            );

            if (zen_rate_limit.used > zen_rate_limit.limit) {
                logger.log(
                    'warn',
                    `API Rate limit has reached for zenhub API, limit is [${zen_rate_limit.limit}] while [${zen_rate_limit.used}] has been used. The rate limit will be reset after [${zen_rate_limit.reset -
                        Date.now() / 1000}]s`
                );

                retry = true;
            } else if (res.statusCode === 408 || res.statusCode === 502) {
                logger.log(
                    'verbose',
                    `== Time out received from the service with status code [${res.statusCode}]`
                );
                retry = true;
            }
        }

        if (retry) {
            let wait_time = parseInt(
                zen_rate_limit.reset * 1000 - Date.now(),
                10
            ) + Math.random() * 10 * 1000; // add a small amount random time here to make sure it's really reset
            if (res) {
                logger.log(
                    'verbose',
                    `API Rate limit has reached for request[${res.request
                        .href}], limit is [${zen_rate_limit.limit}] while [${zen_rate_limit.used}] has been used. The rate limit will be reset after [${zen_rate_limit.reset -
                        Date.now() / 1000}]s`
                );
            } else {
                logger.log(
                    'warn',
                    `Error occurred during the request, the error is [${err}]`
                );
            }

            return this.retry(options, wait_time, 5);
        } else {
            logger.log('debug', '====> End of rateLimitResponseHandler');
            return res;
        }
    }

    getZenhubIssues(rid) {
        return this.api.repositories
            .issues({
                path_params: {
                    repo_id: rid
                }
            })
            .then(response => {
                if (response.statusCode !== 200) {
                    throw new Error(
                        `=> getZenhubIssues(${rid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                }
                return JSON.parse(response.body);
            });
    }

    getZenhubIssue(rid, iid) {
        return this.api.repositories
            .getIssue({
                path_params: {
                    repo_id: rid,
                    issue_number: iid
                }
            })
            .then(response => {
                if (response.statusCode !== 200) {
                    throw new Error(
                        `=> getZenhubIssue(${rid}, ${iid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                }
                return JSON.parse(response.body);
            });
    }

    moveZenhubIssue(rid, iid, targetPipeline, position) {
        return this.api.repositories
            .moveIssue({
                path_params: {
                    repo_id: rid,
                    issue_number: iid
                },
                body_params: {
                    pipeline_id: targetPipeline,
                    position: position
                }
            })
            .then(response => {
                if (response.statusCode !== 200) {
                    logger.log(
                        'error',
                        `=> moveZenhubIssue(${rid}, ${iid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                } else {
                    logger.log(
                        'info',
                        `=> Zenhub Issue(${rid}, ${iid}) is moved to ${targetPipeline} successfully`
                    );
                }
            });
    }

    getEpicsfunction(rid) {
        return this.api.repositories
            .epics({
                path_params: {
                    repo_id: rid
                }
            })
            .then(response => {
                if (response.statusCode !== 200) {
                    throw new Error(
                        `=> getEpics(${rid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                }
                return JSON.parse(response.body);
            });
    }

    getEpic(rid, eid) {
        return this.api.repositories
            .getEpic({
                path_params: {
                    repo_id: rid,
                    epic_id: eid
                }
            })
            .then(response => {
                if (response.statusCode === 404) {
                    logger.log(
                        'warn',
                        `issue[${eid}] is marked as epic using label, but it is NOT a REAL EPIC in ZENHUB.  [getEpicIssues - ${response
                            .request
                            .href}] failed with ${response.statusCode}!!`,
                        response.body
                    );
                    // return null for fake epic
                    return null;
                } else if (response.statusCode === 200) {
                    return JSON.parse(response.body);
                } else {
                    throw new Error(
                        `=> getEpic(${rid}, ${eid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                }
            });
    }

    addIssueToEpic(rid, eid, iss) {
        return this.updateEpicIssues(rid, eid, {
            add_issues: [
                {
                    repo_id: rid,
                    issue_number: iss
                }
            ]
        });
    }

    updateEpicIssues(rid, eid, issues) {
        return this.api.repositories
            .updateEpicIssues({
                path_params: {
                    repo_id: rid,
                    epic_id: eid
                },
                body_params: issues
            })
            .then(response => {
                if (response.statusCode === 200) {
                    return JSON.parse(response.body);
                } else if (response.statusCode === 404) {
                    logger.log(
                        'warn',
                        `=> updateEpicIssues(${rid}, ${eid}) returns ${response.statusCode} with response body [${response.body}]. It might not be a valid epic in zenhub.`
                    );
                } else {
                    throw new Error(
                        `=> updateEpicIssues(${rid}, ${eid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                }
            });
    }

    getZenBoard(rid) {
        return this.api.repositories.getBoard({
            path_params: {
                repo_id: rid
            }
        });
    }
};

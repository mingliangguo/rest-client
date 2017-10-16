'use strict';

const utils = require('./../../lib/utils'),
    config = require('./../../lib/config'),
    RestApi = require('./../../lib/restapi'),
    logger = require('./../../lib/logger');

const github_token = utils.replaceEnvVariable(config.github.app.token);

const github_base_url = config.github.api.base_url;

// rate limit status
let rate_limit = {};

module.exports = class GitHubApi extends RestApi {
    constructor(name = 'GitHub API', baseUrl = github_base_url) {
        super(name, baseUrl);
    }

    getRestDefinition() {
        return {
            orgs: {
                endpoint: '/orgs',
                methods: [
                    {
                        id: 'getOrg',
                        path: '/:orgId',
                        method: 'GET'
                    },
                    {
                        id: 'getOrgRepos',
                        path: '/:orgId/repos',
                        method: 'GET'
                    }
                ]
            },
            repos: {
                baseUrl: github_base_url,
                endpoint: '/repos',
                methods: [
                    {
                        id: 'getRepo',
                        path: '/:owner/:repo',
                        method: 'GET'
                    },
                    {
                        id: 'getIssues',
                        path: '/:owner/:repo/issues',
                        method: 'GET'
                    },
                    {
                        id: 'createIssue',
                        path: '/:owner/:repo/issues',
                        method: 'POST'
                    },
                    {
                        id: 'getMileStones',
                        path: '/:owner/:repo/milestones',
                        method: 'GET'
                    },
                    {
                        id: 'updateIssue',
                        path: '/:owner/:repo/issues/:issue_number',
                        method: 'PATCH'
                    },
                    {
                        id: 'createComment',
                        path: '/:owner/:repo/issues/:number/comments',
                        method: 'POST'
                    }
                ]
            },
            search: {
                baseUrl: github_base_url,
                endpoint: '/search',
                methods: [
                    {
                        id: 'searchIssues',
                        path: '/issues',
                        method: 'GET'
                    }
                ]
            }
        };
    }

    getRequestHandler(options, params) {
        options.headers = utils.mixin(
            {
                Authorization: `Bearer ${github_token}`
            },
            options.headers
        );

        delete options.delay;

        if (rate_limit.remaining <= 0) {
            options.delay = this.rate_limit.reset;
        }

        return options;
    }

    getResponseHandler(options, res, err) {
        logger.log('debug', '====> Enter rateLimitResponseHandler:');
        rate_limit.remaining = parseInt(
            res.headers['x-ratelimit-remaining'],
            10
        );
        rate_limit.reset = parseInt(res.headers['x-ratelimit-reset'], 10);

        logger.log(
            'verbose',
            `GitHub API Rate limit has [${rate_limit.remaining}] remaining, requested uri[${res
                .request.href}]`
        );

        if (rate_limit.remaining <= 0) {
            logger.log(
                'error',
                `API Rate limit has reached for Github API, remaining is [${rate_limit.remaining}], the limit will be reset in [${rate_limit.reset -
                    Date.now() / 1000}ms]!`
            );
        }

        logger.log('debug', '====> End of rateLimitResponseHandler');
        return res;
    }

    getMileStones(owner, repo) {
        return this.api.repos.getMileStones({
            path_params: {
                owner: owner,
                repo: repo
            }
        });
    }

    updateIssue(repo, iid, body) {
        return this.api.repos
            .updateIssue({
                path_params: {
                    repo: repo.name,
                    owner: repo.owner,
                    issue_number: iid
                },
                body_params: body
            })
            .then(response => {
                if (response.statusCode !== 200) {
                    logger.log(
                        'error',
                        `=> updateIssue(${repo.name}, ${iid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                } else {
                    let resJson = JSON.parse(response.body);
                    logger.log(
                        'info',
                        `=>  Issue(${repo.name}, ${iid}) has been closed by [${resJson
                            .closed_by.login}] successfully`
                    );
                    return JSON.parse(response.body);
                }
            });
    }

    createIssue(owner, repo, issue) {
        return this.api.repos.createIssue({
            path_params: {
                owner: owner,
                repo: repo
            },
            body_params: issue
        });
    }

    createStories(owner, repoName, issues, report) {
        let createdIssues = [];
        return this.getMileStones(owner, repoName)
            .then(response => {
                let milestones = JSON.parse(response.body);

                let milestonesMap = {};
                milestones.forEach(milestone => {
                    milestonesMap[milestone.title] = milestone.number;
                });
                return milestonesMap;
            })
            .then(milestonesMap => {
                let issues_promises = [];
                issues.stories.forEach(story => {
                    if (story.milestone) {
                        story.milestone =
                            milestonesMap[story.milestone] || story.milestone;
                    }

                    let p = this.createIssue(owner, repoName, story);
                    issues_promises.push(p);

                    p
                        .then(response => {
                            let iss = JSON.parse(response.body);
                            logger.log(
                                'info',
                                `new issue is created => [${iss.number} - ${iss.title}](${iss.html_url})`
                            );

                            iss.epic_id = story.add_to_epic;
                            createdIssues.push(iss);

                            response.created = true;
                            report.addIssue(iss);
                        })
                        .catch(error => {
                            logger.log(
                                'error',
                                'something wrong occured during issue creation',
                                error
                            );
                            report.addIssue({
                                title: story.title,
                                assignee: {
                                    login: story.assignee
                                },
                                created: false
                            });
                        });
                });

                return Promise.all(issues_promises);
            })
            .then(() => {
                report.save();
                return createdIssues;
            })
            .catch(err =>
                logger.log(
                    'error',
                    `error occured during creating stories => [${err}]`
                )
            );
    }

    searchIssues(filters, result, page) {
        page = page || 1;
        result = result || [];
        return this.api.search
            .searchIssues({
                query_params: {
                    q: filters,
                    per_page: 100,
                    page: page
                }
            })
            .then(response => {
                let data = JSON.parse(response.body);
                if (data && Array.isArray(data.items)) {
                    result = result.concat(data.items);
                }
                if (data.total_count === result.length) {
                    return result;
                } else if (response.statusCode !== 200) {
                    logger.log(
                        'warn',
                        `Request[${response.request
                            .href}] returns status code: [${response.statusCode}] returned, response body => [${response.body}]`
                    );
                    return result;
                } else {
                    return this.searchIssues(filters, result, page + 1);
                }
            });
    }

    createComment(repo, iid, body) {
        return this.api.repos
            .createComment({
                path_params: {
                    repo: repo.name,
                    owner: repo.owner,
                    number: iid
                },
                body_params: { body: body }
            })
            .then(response => {
                if (response.statusCode !== 201) {
                    logger.log(
                        'error',
                        `=> createComment(${repo.name}, ${iid}) returns ${response.statusCode} with response body [${response.body}]`
                    );
                } else {
                    let resJson = JSON.parse(response.body);
                    logger.log(
                        'debug',
                        `=>  Comment(${repo.name}, ${iid}) has a new comment [${resJson.body}] `
                    );
                    return JSON.parse(response.body);
                }
            });
    }
};

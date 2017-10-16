'use strict';
const logger = require('./logger'),
    Tracker = require('./tracker'),
    request = require('request-promise');

let track_time = process.env.TRACK_TIME || false;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = (options, trackers = []) => {
    logger.log('debug', '====> Begin to dump request options:');
    logger.log('debug', `request[${options.method}] => [${options.uri}]`);
    logger.log('debug', JSON.stringify(options));
    logger.log('debug', '====> End of request options.');

    let begin = Date.now();
    let tracker = new Tracker();
    tracker.start(options);
    trackers.push(tracker.getData());

    return request(options)
        .then(res => {
            tracker.stop(res);

            let duration = Date.now() - begin;

            if (track_time) {
                logger.log(
                    'info',
                    `request[${options.method} : ${options.uri}] took [${duration}ms] to complete, the response code is [${res.statusCode}]`
                );
            }

            if (res) {
                logger.log('debug', '====> Begin to dump response:');
                logger.log('debug', '==> response status code is:', res.statusCode);
                logger.log('debug', '==> dump response body:\n', res.body);
                Object.keys(res.headers)
                    .forEach(header => {
                        logger.log('debug', '==> header:', header, '=', res.headers[header]);
                    });
                logger.log('debug', '====> End of dump response');
            }

            return res;
        })
        .catch(err => {
            tracker.stop(null, err);
            // rethrow the error
            throw err;
        });
};

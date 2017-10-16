////////////////////////////////////////////////////////////////////////////////

'use strict';

const BoxApi = require('./box-api'),
    utils = require('./../../lib/utils'),
    Executor = require('./../../lib/Executor'),
    perf = require('execution-time')(),
    config = require('./../../lib/config'),
    logger = require('./../../lib/logger');

let boxapi = new BoxApi(config.box);

let usersToCollab = [
    '409071373', '409065575', '409065269', '409056486', '409065477',
    '409030282', '409034199', '409063521', '409070804', '409054620'
];

let time_tracker = {};

let createFolder = () => {
    return boxapi.createFolder(`batch-test-${Date.now()}`, 0).then((res) => {
        time_tracker.createFolderEnd = perf.stop();
        if (res.statusCode !== 201) {
            throw new Error(`failed to create test folder with status code[${res.statusCode}] and response => ${JSON.stringify(res.body)}`);
        }

        let folderRes = JSON.parse(res.body);
        // logger.log('info', `folder[${folderRes.id}] has been created with [${res.body}]`);
        return folderRes.id;
    });
};

let createCollabs = () => {
    time_tracker.createFolderStart = perf.start();

    return createFolder().then((fid => {
        time_tracker.createBatchStart = perf.start();
        return boxapi.batchAddCollaboration(fid, usersToCollab);
    })).then(res => {
        time_tracker.createBatchEnd = perf.stop();
        if (res.statusCode > 300) {
            throw new Error(`failed to create collaborations in batch with status code[${res.statusCode}] and response => ${JSON.stringify(res.body)}`);
        }

        logger.log('info', `BatchAPI took [${time_tracker.createBatchEnd.time}]`);
        logger.log('info', `CreateBoxFolder took [${time_tracker.createFolderEnd.time}]`);
        logger.log('info', `Repsonse body => \n${res.body}`);
        return time_tracker.createBatchEnd.time;
    });
};

let createSingleCollab = () => {
    return createFolder()
        .then((fid) => {
            let args = usersToCollab.map(uid => [fid, 'editor', uid]);
            let addCollabFunc = (fid, role, uid) => {
                return boxapi.addCollab(fid, role, uid);
            };

            let executor = new Executor({
                func: addCollabFunc,
                numberOfCalls: args.length,
                dynamicArgs: args
            });
            time_tracker.createSingleCollab_start = perf.start();
            return executor.exec().then(() => {
                time_tracker.createSingleCollab_stop = perf.stop();
                logger.log('info', `==> create single collaboration took [${time_tracker.createSingleCollab_stop.time}]...`);
                return time_tracker.createSingleCollab_stop.time;
            });
        });
};

let count = 2;

boxapi.getServerToken().then(() => {
    logger.log('info', '===> use server token');
    logger.log('info', '==> begin batch collaboration test...');
    let executor = new Executor({
        func: createCollabs,
        numberOfCalls: count
    });
    return executor.exec();
}).then((data) => {
    logger.log('info', '==> begin single collaboration test...');
    let executor = new Executor({
        func: createSingleCollab,
        numberOfCalls: count
    });

    return executor.exec().then(result => {
        // combine the result
        return {
            batch: data,
            batch_avg: utils.avg(data),
            single: result,
            single_avg: utils.avg(result)
        };
    });

}).then((data) => {
    logger.log('info', 'benchmark result', data);
}).catch((err) => {
    logger.log('error', 'something bad occured with err', err);
});

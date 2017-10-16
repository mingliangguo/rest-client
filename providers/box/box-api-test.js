////////////////////////////////////////////////////////////////////////////////

'use strict';

const fs = require('fs-extra'), //File System - for file manipulation
    BoxApi = require('./box-api'),
    yaml = require('js-yaml'),
    config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8')),
    ExcelReport = require('./../../lib/report'),
    logger = require('./../../lib/logger'),
    Executor = require('./../../lib/executor'),
    utils = require('./../../lib/utils');

const jwt_app_key = 'jwt_app_vm65';
config.box.jwt_app = config.box[jwt_app_key] || config.box.jwt_app;
// set request time to 120s
config.box.defaultTimeout = 120 * 1000;
config.box.retryConfig = {
    enabled: true,
    limit: 5,
    default_wait_time: 5 * 1000,
    max_wait_time: 300 * 100
};
let boxapi = new BoxApi(config.box);

logger.log('info', '===> use server token');

const enduration_test_report_file = utils.appendTimestamp(
    'logs/endurance/enduration-test-report.xlsx'
);
const enduration_test_raw_data_file = utils.appendTimestamp(
    'logs/endurance/enduration-test-raw.log'
);
const request_count = 3;

let createExcelReport = (report_file, data) => {
    data = data.map(entry => {
        return {
            url: entry.request.uri,
            method: entry.request.method,
            status_code: entry.response && entry.response.status_code,
            content_type: entry.request.headers['Content-Type'],
            request_body: entry.request.body,
            response_body: entry.response && entry.response.body,
            start_time: entry.start_time.toISOString(),
            stop_time: entry.stop_time && entry.stop_time.toISOString(),
            duration: entry.duration,
            box_api_error:
                entry.response_error && JSON.stringify(entry.response_error)
        };
    });

    let columns = [
        {
            header: 'URL',
            key: 'url',
            width: 50
        },
        {
            header: 'METHOD',
            key: 'method',
            width: 10
        },
        {
            header: 'StatusCode',
            key: 'status_code',
            width: 10
        },
        {
            header: 'BoxAPIError',
            key: 'box_api_error',
            width: 10
        },
        {
            header: 'Content-Type',
            key: 'content_type',
            width: 20
        },
        {
            header: 'start time',
            key: 'start_time',
            width: 25
        },
        {
            header: 'end time',
            key: 'stop_time',
            width: 25
        },
        {
            header: 'duration',
            key: 'duration',
            width: 10
        }
    ];
    // columns.forEach(col => col.style = );
    let params = {
        filename: report_file,
        defaultColumns: columns,
        append: true
    };
    let excelReport = new ExcelReport(params);
    excelReport.addSheetData({
        name: 'perf-report',
        data: data
    });

    return excelReport.save();
};

let createFolder = (name, parentId) => {
    return boxapi.createFolder(name, parentId).then(res => {
        if (res.statusCode !== 201) {
            throw new Error(
                `failed to create test folder with response => ${JSON.stringify(
                    res
                )}`
            );
        }
        return JSON.parse(res.body).id;
    });
};

let collaborationTest = test_parent_folder_id => {
    let folder_id = null;
    return (
        Promise.all([
            createFolder(
                `gary-collaboration-test-folder-${Date.now()}`,
                test_parent_folder_id
            ),
            boxapi.getUsers()
        ])
        .then(data => {
            let usersRes = data[1];
            folder_id = data[0];

            if (usersRes.statusCode !== 200) {
                throw new Error(
                    `failed to get users with response => ${JSON.stringify(
                        usersRes
                    )}`,
                    usersRes
                );
            }

            logger.log('info', `folder id is => ${folder_id}`);

            // build the dynamic args for add collaboration
            // add random users from the org to the folder collaboration
            let dynamicArgs = JSON.parse(usersRes.body)
                .entries.filter(() => Math.random() >= 0.5)
                .map(item => [folder_id, 'editor', item.id]);

            return new Executor({
                func: boxapi.createViewPath,
                context: boxapi,
                async: true,
                dynamicArgs: dynamicArgs
            }).exec();
        })
        .then(() => {
            return boxapi.getFolderCollab(folder_id);
        })
        .then(res => {
            if (res.statusCode !== 200) {
                logger.log(
                    'error',
                    `error occurred during retrieving folder collaboration ==> status_code: [${res.statusCode}], body: [${res.body}]`
                );
                return res;
            }
            let removeAddGet = (fid, cid, uid) => {
                return boxapi
                    .getCollab(cid)
                    .then(() => boxapi.deleteCollab(cid))
                    .then(() => boxapi.getFolderCollab(fid))
                    .then(() => boxapi.getUsers())
                    .then(() => boxapi.getUserInfo(uid));
            };

            // randomly remove users from the folder
            let dynamicArgs = JSON.parse(res.body)
                .entries.filter(() => Math.random() >= 0.5)
                .map(item => [folder_id, item.id, item.accessible_by.id]);
            return new Executor({
                func: removeAddGet,
                async: true,
                dynamicArgs: dynamicArgs
            }).exec();
        })
        .then(() => {
            let getFunc = fid => {
                return boxapi
                    .getUsers()
                    .then(() => boxapi.getFolderCollab(fid));
            };
            return new Executor({
                func: getFunc,
                async: true,
                numberOfCalls: request_count,
                args: [folder_id]
            }).exec();
        })
        .then(() => {
            let tracker_data = boxapi.getTrackingData();
            logger.log(
                'info',
                `Task Done! Total [${tracker_data.length}] requests made!!`
            );

            // log the raw tracking data
            return fs.appendFile(
                enduration_test_raw_data_file,
                tracker_data.map(item => JSON.stringify(item)).join('\n')
            );
            // // append to the excel report
            // return createExcelReport(
            //     enduration_test_report_file,
            //     tracker_data
            // );
        })
        // reset the tracker each time after report is generated
        .then(() => boxapi.resetTracker())
        // ignore errors if any
        .catch(err => {
            logger.log(
                'error',
                `error caught during the run => error_message: [${err &&
                    err.message}], errorno: [${err && err.errno}]`,
                err
            );
        })
    );
};

let should_stop = false;
let run_test = fid => {
    if (should_stop || fs.existsSync('task.kill')) {
        logger.log('info', 'stop running test, prepare to exit...');
    } else {
        return collaborationTest(fid).then(() => run_test());
    }
};

// let boxapi_test_interval_handle, refresh_token_handle;
let start_test = () => {
    return boxapi
        .getServerToken()
        .then(() => {
            return createFolder(
                `gary-collaboration-test-folder-${Date.now()}`,
                0
            );
        })
        .then(fid => {
            // boxapi_test_interval_handle = setInterval(() => {
            //     collaborationTest(fid);
            // }, 10 * 1000);
            run_test(fid);
        })
        .catch(err =>
            logger.log('error', 'error caught during the test ==> ', err)
        );
};

let refresh_token_handle = setInterval(() => {
    // refresh the token every 55 minutes
    boxapi.getServerToken();
}, 55 * 60 * 1000);

// kick off the test
start_test();

// gracifully shutdown
let shutdown = () => {
    logger.info('signal recieved, prepare to stop the test ...');
    should_stop = true;
    // clearInterval(boxapi_test_interval_handle);
    clearInterval(refresh_token_handle);
    clearInterval(checkStopStatus);
};

let checkStopStatus = setInterval(() => {
    if (fs.existsSync('task.kill')) {
        shutdown();
    }
}, 30 * 1000);

process.on('SIGTERM', () => {
    shutdown();
});

process.on('SIGINT', () => {
    shutdown();
});

'use strict';

module.exports = class Tracker {
    constructor() {
        this.data = {};
    }

    start(options) {
        Object.assign(this.data, {
            request: options,
            start_time: new Date()
        });
    }

    stop(res, err) {
        let stop_time = new Date();
        Object.assign(this.data, {
            response: res && {
                status_code: res.statusCode,
                body: res.body,
                headers: res.headers
            },
            response_error: err && {
                error_code: err.code,
                error_no: err.errno,
                error_message: err.message
            },
            stop_time: stop_time,
            duration: stop_time - this.data.start_time
        });
    }

    getData() {
        return this.data;
    }
};

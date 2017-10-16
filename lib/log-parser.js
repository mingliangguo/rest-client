////////////////////////////////////////////////////////////////////////////////

'use strict';

const fs = require('fs'),
    es = require('event-stream'),
    logger = require('./logger');

module.exports = class LogParser {
    constructor(name, logfile) {
        this.name = name;
        this.logfile = logfile;
        this.result = [];
    }

    /**
     * line parser, if a row data is returned, it will be added to the result.
     */
    parseLine(line, lineNum) {}

    /**
     * determine if the lineData is needed
     */
    isLineNeeded (lineData) {
        return true;
    }

    /**
     * post processing of result data
     * @param {array} result
     */
    processResult(result) {
        return result;
    }

    parse() {
        return new Promise((resolve, reject) => {
            let lineNum = 1;
            let s = fs
                .createReadStream(this.logfile)
                .pipe(es.split())
                .pipe(
                    es
                        .mapSync(line => {
                            // pause the readstream
                            s.pause();

                            let lineData = this.parseLine(line, lineNum++);
                            if (this.isLineNeeded(lineData)) {
                                this.result.push(lineData);
                            }

                            // resume the readstream, possibly from a callback
                            s.resume();
                        })
                        .on('error', err => {
                            logger.log(
                                'error',
                                `Error while reading file => [${this
                                    .logfile}].`,
                                err
                            );
                            reject(this.result);
                        })
                        .on('end', () => {
                            logger.log(
                                'info',
                                `Parser [${this
                                    .name}] has finished parsing the file [${this
                                    .logfile}]`
                            );
                            resolve(this.processResult(this.result));
                        })
                );
        });
    }
};

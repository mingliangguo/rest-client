'use strict';

const DEFAULT_NUMBER_OF_CALLS = 3;
module.exports = class Executor {
    /**
     * {
     *   numberrOfCalls: number,
     *   async: <true|false, to run the func async or sync>,
     *   func: <func, function to be run>,
     *   context: <object, function context>
     *   args: <array, args to be passed in>,
     *   dynamicArgs: <array, dynamic args, e.g. each element will be used for the corresponding func call by order>
     * }
     * @param {object} args
     */
    constructor(args) {
        Object.assign(this, args);

        this.numberOfCalls =
            this.numberOfCalls ||
            (this.dynamicArgs && this.dynamicArgs.length) ||
            DEFAULT_NUMBER_OF_CALLS;
        this.async = this.async || false;
    }

    exec() {
        if (this.async) {
            return Promise.all(
                Array(this.numberOfCalls)
                    .fill(1)
                    .map((item, idx) =>
                        this.func.apply(
                            this.context,
                            (this.dynamicArgs && this.dynamicArgs[idx]) ||
                                this.args
                        )
                    )
            );
        } else {
            // return this.execSync(0, []);
            return this.execReduce();
        }
    }
    execReduce() {
        return Array(this.numberOfCalls)
            .fill(1)
            .reduce((prev, curr, idx) => {
                return prev.then((result) => {
                    return this.func.apply(
                        this.context,
                        (this.dynamicArgs && this.dynamicArgs[idx]) || this.args
                    ).then(data => {
                        result.push(data);
                        return result;
                    });
                });
            }, new Promise(resolve => resolve([])));
    }

    execSync(counter, result) {
        if (counter >= this.numberOfCalls) return result;

        return Promise.resolve(
            this.func.apply(
                this.context,
                (this.dynamicArgs && this.dynamicArgs[counter]) || this.args
            )
        ).then(data => {
            result.push(data);
            return this.execSync(++counter, result);
        });
    }
};

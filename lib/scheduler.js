'use strict';

const winston = require('winston');

class Scheduler {
    constructor(name, rateConfig) {
        this.name = name || 'unamed scheduler';
        this.queues = [];
        this.rateConfig = rateConfig;
        this.counter = 0;
    }

    enqueue(item) {
        if (!this.rateConfig || this.rateConfig.disabled) {
            // if rateConfig is disabled, execute immediately
            item.resolvedTimestamp = Date.now();
            item.resolve();
            return;
        }
        item.timestamp = Date.now();
        this.queues.push(item);
        this.counter++;
        if (this.counter < this.rateConfig.limit) {
            // item.process();
            item.started = true;
            setTimeout(
                () => {
                    item.resolve();
                },
                Math.random() * this.rateConfig.period / 2
            );
        }

        if (!this.timer) {
            this.startTimer();
        }
    }

    startTimer() {
        // if already started, skip
        if (this.timer) {
            return;
        }
        winston.log('verbose', `== Start the scheduler[${this.name}]. Total [${this.queues.length}] items in the waiting list.`);

        this.timer = setInterval(() => {
            if (this.queues.length > 0) {
                // find all started but not resolved items
                let unresolvedItems = this.queues.filter(item => item.started && !item.resolved);

                this.queues = this.queues
                    .filter(item => !item.started);

                let toprocess = this.queues
                    .splice(0, this.rateConfig.limit - unresolvedItems.length);
                // .splice(0, this.rateConfig.limit);

                winston.log('info', `== Scheduler[${this.name}], [${toprocess.length}] items to be processed and there are still [${this.queues.length}] items waiting in the queue.`);

                toprocess
                    .filter(item => !item.started)
                    .forEach(item => {
                        // item.process();
                        item.started = true;
                        setTimeout(
                            () => {
                                item.resolve();
                            },
                            Math.random() * this.rateConfig.period / 2
                        );
                    });
                this.counter = 0;
            }

            if (this.queues.length === 0) {
                winston.log('verbose', `== stopping the scheduler[${this.name}] ...`);
                this.stop();
            } else {
                winston.log('verbose', `== [${this.queues.length}] items are still left in the queue, waiting for next cycle...`);
            }
        }, this.rateConfig.period);

    }

    stop() {
        winston.log('verbose', `== Stop the scheduler[${this.name}]`);

        clearInterval(this.timer);
        this.timer = null;
    }
}
module.exports = Scheduler;
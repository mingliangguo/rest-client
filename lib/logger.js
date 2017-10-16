const winston = require('winston'),
    dailyRotateFile = require('winston-daily-rotate-file');

winston.addColors({
    'debug': 'blue',
    'verbose': 'cyan',
    'info': 'green',
    'warn': 'yellow',
    'error': 'red'
});

winston.configure({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({ colorize: true, 'timestamp': true, handleExceptions: true}),
        new (dailyRotateFile)({
            name: 'boxapi',
            filename: './logs/log-box-api',
            datePattern: '-yyyy-MM-dd.log',
            level: 'info',
            handleExceptions: true,
            json: false
        }),
        new (dailyRotateFile)({
            name: 'trace',
            filename: './logs/file_rotate_trace',
            datePattern: '-yyyy-MM-dd.log',
            level: 'debug',
            handleExceptions: true,
            json: false
        })
    ]
});

module.exports = winston;

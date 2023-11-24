import winston from 'winston'
import fs from 'fs'

const configDefaults = {
    winstonConsoleTransport: {
        level: 'info',
        handleExceptions: false,
        timestamp: true,
        stringify: true,
        colorize: true,
        json: false
    },
    domainName: 'api-profile.id',
    dbLocation: '/home/paradigma/api-profile/registrar_db/api_profile.db',
    port: 3060,
    prometheus: { start: false, port: 0 },
    minBatchSize: 1,
    did_web_controller: "https://domains.paradigma.global/api-openid/"

}


export function getConfig() {
    let config = Object.assign({}, configDefaults)
    if (process.env.API_PROFILE_DEVELOP) {
        config = Object.assign({}, configDevelopDefaults)
        config.development = true
    }

    if (process.env.API_PROFILE_CONFIG) {
        const configFile = process.env.API_PROFILE_CONFIG
        Object.assign(config, JSON.parse(fs.readFileSync(configFile)))
    }

    if (process.env.API_PROFILE_PROMETHEUS_PORT) {
        config.prometheus = { start: true, port: parseInt(process.env.API_PROFILE_PROMETHEUS_PORT) }
    }

    config.winstonConfig = {
        transports: [
            new winston.transports.Console(config.winstonConsoleTransport),
            new winston.transports.File({
                maxsize: 5120000,
                maxFiles: 10,
                filename: `${__dirname}/../logs/api_profile.log`,
                level: 'debug',
                handleExceptions: false,
                timestamp: true,
                stringify: true,
                colorize: false,
                json: false
            })
        ]
    }

    return config
}

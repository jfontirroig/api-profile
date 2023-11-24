import cors from 'cors'
import express from 'express'
import bodyParser from 'body-parser'
import logger from 'winston'
import colors from 'colors' //Mantener en Scope. Permite cambiar el color a los console.log()
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import https from 'https'
import fs from 'fs'

import { ApiProfileServer } from './apiprofileserver'
import { createMiddleware as createPrometheusMiddleware } from '@promster/express'
import { createServer } from '@promster/server'

const HEADERS = { 'Content-Type': 'application/json' }

export function makeHTTPServer(config) {

    // initalizing express instance.
    logger.info('http - makeHTTPServer --> Initalizing Server Core')

    const app = express()
    logger.info('http - makeHTTPServer --> Express instance: ' + 'OK')

    // enable cors
    const corsOptions = {
        origin: '*',
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }
    app.use(cors(corsOptions))
    logger.info('http - makeHTTPServer --> CORS: ' + 'OK')
    app.use(cookieParser())
    logger.info('http - makeHTTPServer --> Cookie Parser: ' + 'OK')
        // monitoring request -> will be disabled on production
    app.use(morgan(':method :url :status :response-time ms - :res[content-length]'))
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    logger.info('http - makeHTTPServer --> Mounting Server Services')
    logger.info('http - makeHTTPServer --> Server Services: ' + 'OK')

    app.route('/api-profile/').get((req, res) => {
        logger.info('http - makeHTTPServer --> Usuario accede por browser')
    })

    const server = new ApiProfileServer(config)

    if (config.prometheus && config.prometheus.start && config.prometheus.port) {

        app.use(createPrometheusMiddleware({
            app,
            options: {
                normalizePath: (path) => {
                    if (path.startsWith('/api-profile/.well-known/profile')) {
                        return '/api-profile/.well-known/profile'
                    }
                    if (path.startsWith('/api-profile/.well-known/did.json')) {
                        return '/api-profile/.well-known/did.json'
                    }
                    return path
                }
            }
        }))
        const port = config.prometheus.port
            // Create `/metrics` endpoint on separate server
            // Certificados para https
        const httpsOptions = {
            key: fs.readFileSync('/etc/letsencrypt/live/domains.paradigma.global/privkey.pem'),
            cert: fs.readFileSync('/etc/letsencrypt/live/domains.paradigma.global/fullchain.pem'),
            ca: fs.readFileSync('/etc/letsencrypt/live/domains.paradigma.global/chain.pem')
        }
        logger.info(`http - makeHTTPServer --> \nServer Certificates: ${httpsOptions}`)
        https.createServer(httpsOptions, server).listen(port, () => {
            logger.info(`http - makeHTTPServer --> @promster/server started on port ${port}.`)
        })
    }

     app.get('/api-profile/.well-known/profile/:userid', (req, res) => {

        let parameters = req.params.userid
        const parametersSplit = parameters.split(',')
        const useridSplit = parametersSplit[0]

        logger.info('http - profile  userid--> ' + useridSplit)

        server.profile(
                useridSplit
             )
            .then((response) => {
                res.write(response)
                res.end()
            })
            .catch((err) => {
                res.write(err)
                res.end()
            })

    })

    app.get('/api-profile/.well-known/did.json/:atributes', (req, res) => {

        let parameters = req.params.atributes
        const parametersSplit = parameters.split(',')
        const useridSplit = parametersSplit[0]
        const stxaddressSplit = parametersSplit[1]

        logger.info('http - did.json  userid--> ' + useridSplit)
        logger.info('http - did.json  stxaddress--> ' + stxaddressSplit)

        server.didweb(
               useridSplit,
               stxaddressSplit
             )
            .then((response) => {
                res.write(response)
                res.end()
            })
            .catch((err) => {
                res.write(err)
                res.end()
            })

    })

    return server.initializeServer()
        .then(() => {})
        .then(() => app)

}

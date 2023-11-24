/* @flow */
import logger from 'winston'
import AsyncLock from 'async-lock'
import util from 'util'
import axios from 'axios'
import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';
import qs from 'qs'
import FormData from 'form-data'
import fs from 'fs'

//import { RegistrarQueueDB } from './db'

const punycode = require('punycode/');

const QUEUE_LOCK = 'queue'

export class ApiProfileServer {
    //db: RegistrarQueueDB;
    lock: AsyncLock;

    constructor(config: {
        dbLocation: string,
        did_web_controller: string
    }) {

        //this.db = new RegistrarQueueDB(config.dbLocation)
        this.keycloakUrl =  config.did_web_controller
        this.lock = new AsyncLock()
    }

    async initializeServer() {
        //await this.db.initialize()
    }

    async profile(
        userid: string
    ): Promise < void > {

        let respuesta = ''
        let configProfileZonefile = ''

        var configProfile = {
            method: 'get',
            url: 'https://stacks-node-api.mainnet.stacks.co/v1/names/' + userid
        };

        logger.info('ApiProfileServer - profile - configProfile --> ', configProfile)

        await axios(configProfile)
            .then(function(responseProfile) {
                const {zonefile} = responseProfile.data
                const zonefile1 = zonefile.indexOf('"');
                const zonefile2 = zonefile.lastIndexOf('"');
                const zonefile3 = zonefile.substring(zonefile1+1,zonefile2)
                const zonefile4 = zonefile3.replace(/\\/g,'')
                configProfileZonefile = {
                    method: 'get',
                    url: zonefile4
                };
            })
            .catch(function(error) {
                logger.error('ApiProfileServer - profile - catch --> Failure read Zonefile', error)
                respuesta = JSON.stringify({
                    success: false,
                    message: "Failure read Zonefile",
                    code: 2,
                    data: error})

              });


          logger.info('ApiProfileServer - profile - configProfileZonefile --> ', configProfileZonefile)

          await axios(configProfileZonefile)
              .then(function(result) {
                  logger.info('ApiProfileServer - profile - then --> ', JSON.stringify(result.data[0]))
                  respuesta = JSON.stringify(result.data[0])

              })
              .catch(function(error) {
                  logger.error('ApiProfileServer - profile - catch --> Failure read Profile', error)
                  respuesta = JSON.stringify({
                      success: false,
                      message: "Failure read Profile",
                      code: 1,
                      data: error})

              });


        /*
        try {
            await this.lock.acquire(
                QUEUE_LOCK,
                async() => {
                    try {
                        await this.db.addToQueue(userid)
                    } catch (err) {
                        logger.error(`ApiProfileServer - Add DB profile - catch --> Error processing DB registration: ${err}`)
                        logger.error(err.stack)
                        //throw err
                    }
                }, { timeout: 5000 }
            )
        } catch (err) {
            if (err && err.message && err.message == 'async-lock timed out') {
                logger.error('ApiProfileServer - lock - catch --> Failure acquiring registration lock', {
                    msgType: 'lock_acquire_fail'
                })
                //throw new Error('Failed to obtain lock')
            } else {
                //throw err
            }
        }
        */

        return respuesta
    }

    async didweb(
        userid: string,
        stxaddress: string
    ): Promise < void > {

        let respuesta = ''

        const userProfileX = punycode.toUnicode(userid)

        let stxAddress2X = stxaddress

        let userProfile9X = ''
         if (userid.includes('xck.app') === true){
          userProfile9X = `${userProfileX}`
        }else {
          userProfile9X = `my.xck.app:${userProfileX}`
        }

        let jwtDidW3c = ''
        jwtDidW3c = jwtDidW3c + `{`
        jwtDidW3c = jwtDidW3c + `  "@context": "https://www.w3.org/ns/did/v1",`
        jwtDidW3c = jwtDidW3c + `  "did:web": "${userProfile9X}",`
        jwtDidW3c = jwtDidW3c + `  "verificationMethod": [{`
        jwtDidW3c = jwtDidW3c + `     "id": "did:web:${userProfileX}",`
        jwtDidW3c = jwtDidW3c + `     "type": "Secp256k1",`
        jwtDidW3c = jwtDidW3c + `     "controller": "keycloak:${this.keycloakUrl}#OAuth",`
        jwtDidW3c = jwtDidW3c + `     "stacksAddress": "${stxAddress2X}"`
        jwtDidW3c = jwtDidW3c + `  }],`
        jwtDidW3c = jwtDidW3c + `  "authenticationMethod": [{`
        jwtDidW3c = jwtDidW3c + `     "id": "did:web:${userProfileX}",`
        jwtDidW3c = jwtDidW3c + `     "controller": "keycloak:${this.keycloakUrl}#OpenID"`
        jwtDidW3c = jwtDidW3c + `  }]`
        jwtDidW3c = jwtDidW3c + `}`

        respuesta = jwtDidW3c

        return respuesta
    }

    shutdown() {
        //return this.db.shutdown()
    }
}

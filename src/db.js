/* @flow */

import sqlite3 from 'sqlite3'
import logger from 'winston'
const path = require('path')

const CREATE_QUEUE = `CREATE TABLE apiprofile (
 apiprofileUserId TEXT NOT NULL
 );`

const CREATE_QUEUE_INDEX = `CREATE INDEX apiprofile_index ON
apiprofile (apiprofileUserId);`


const APIPROFILE_PAGE_SIZE = 100

function dbRun(db: sqlite3.Database, cmd: string, args ? : Array < Object > ): Promise < void > {
    if (!args) {
        args = []
    }
    return new Promise((resolve, reject) => {
        db.run(cmd, args, (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

function dbAll(db: sqlite3.Database, cmd: string, args ? : Array < Object > ): Promise < Array < Object >> {
    if (!args) {
        args = []
    }
    return new Promise((resolve, reject) => {
        db.all(cmd, args, (err, rows) => {
            if (err) {
                reject(err)
            } else {
                resolve(rows)
            }
        })
    })
}


function isInMemory(dbPath: string) {
    return dbPath.includes(':memory:')
}

export class RegistrarQueueDB {
    dbLocation: string
    db: sqlite3.Database

    constructor(dbLocation: string) {

        if (isInMemory(dbLocation)) {
            this.dbLocation = dbLocation
        } else {
            const dbPath = path.resolve(__dirname, dbLocation)
            this.dbLocation = dbPath
        }
    }

    initialize(): Promise < void > {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbLocation, sqlite3.OPEN_READWRITE, (errOpen) => {
                if (errOpen) {
                    logger.warn(`No database found ${this.dbLocation}, creating`)
                    this.db = new sqlite3.Database(
                        this.dbLocation, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (errCreate) => {
                            if (errCreate) {
                                reject(`Failed to load database ${this.dbLocation}`)
                            } else {
                                logger.warn('Creating tables...')
                                this.checkTablesAndCreate()
                                    .then(() => resolve())
                            }
                        })
                } else {
                    return this.checkTablesAndCreate()
                        .then(() => resolve())
                }
            })
        })
    }

    async checkTablesAndCreate(): Promise < void > {
        const needsCreation = await this.tablesExist()
        if (needsCreation.length === 0) {
            return
        } else {
            logger.info(`Creating ${needsCreation.length} tables.`)
            await this.createTables(needsCreation)
        }
    }

    tablesExist() {
        return dbAll(this.db, 'SELECT name FROM sqlite_master WHERE type = "table"')
            .then(results => {
                const tables = results.map(x => x.name)
                const toCreate = []
                if (tables.indexOf('apiprofile') < 0) {
                    toCreate.push(CREATE_QUEUE)
                    toCreate.push(CREATE_QUEUE_INDEX)
                }

                return toCreate
            })
    }

    async createTables(toCreate: Array < string > ): Promise < void > {
        for (const createCmd of toCreate) {
            await dbRun(this.db, createCmd)
        }
    }

    async addToQueue(apiprofileUserId: string): Promise < void > {
        const dbCmd = 'INSERT INTO apiprofile ' +
            '(apiprofileUserId) VALUES (?)'
        const dbArgs = [apiprofileUserId]
        return await dbRun(this.db, dbCmd, dbArgs)
    }

    shutdown(): Promise < void > {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
            this.db = undefined
        })
    }
}

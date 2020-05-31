`use strict`
const { Worker } = require('worker_threads')
const debug = require('debug')('ThreadsManager')

class ThreadsManager {
    _length = 0
    _workers = []
    _maintainInterval = null
    _prefix = "remote_"

    constructor(workerPath = null, workerOptions = { stderr: false, stdout: false }) {
        if (workerPath === null) {
            throw new Error("workerPath is undefined")
        }

        this.workerPath     = workerPath
        this.workerOptions  = workerOptions
    }

    /*
    * Возвращает количество рабочих воркеров
    * */
    get length() {
        return this._length
    }

    /*
    * Сеттер вызовет ошибку
    * */
    set length(v) {
        throw new Error("Cannot setting length property")
    }

    /*
    * Поддерживает работе указанное количество потоков
    * */
    maintain(counter = 1) {
        if (this._maintainInterval !== null) {
            const error = new Error('Method maintain() already started. You need call stopAll() before.')
            error.code = 'EMAINTAIN'
            throw error
        }

        let processing = false

        this._maintainInterval = setInterval(() => {
            if (counter - this.length > 0 && processing === false) {
                processing = true
                this.add(counter - this.length)
                    .then(() => processing = false)
            }
        }, 100)
    }

    /*
    * Запускает указанное количество потоков. Промис.
    * */
    add(counter = 1) {
        const arr = []
        for (let i = 0; i < counter; i++) {
            arr.push(this.addOne())
        }

        return Promise.all(arr)
    }

    /*
    * Убивает все потоки и останавливает действие метода maintain()
    * */
    stopAll() {
        clearInterval(this._maintainInterval)
        this._maintainInterval = null

        for(const worker of this._workers) {
            worker.terminate()
        }
    }

    /*
    * Запускает один поток. Промис.
    * */
    addOne() {
        let threadId = 0
        let logger = null

        return new Promise(resolve => {
            const worker = new Worker(this.workerPath, this.workerOptions)

            worker.once('online', () => {
                threadId = worker.threadId
                logger = debug.extend(`WRK_${threadId}`)
                logger("Started")
                this._length++
                this._workers.push(worker)
                resolve()
            })

            worker.once('exit', code => {
                logger(`Finished`)
                this._length--

                for (let i = 0; i < this._workers.length; i++) {
                    if (this._workers[i].threadId === -1) {
                        this._workers.splice(i,1)
                        break
                    }
                }
            })

            worker.on('message', msg   => this._onMessage(msg))
            worker.once('error'  , error => this._onError(error, logger))
        })
    }

    /*
    * Формирует пакет с ошибкой для отправки воркеру. В качестве параметра сама ошибка.
    * */
    sendError(err) {
        return {
            status: "error",
            message: err.message,
            code: err.code
        }
    }

    /*
    * Формирует пакет с данными для отправки воркеру
    * */
    sendSuccess(data) {
        return {
            status: "success",
            data: data
        }
    }

    /*
    * Обработка входящих запросов от воркеров
    * */
    _onMessage(packet) {
        const { port, cmd, data } = packet

        const methodName = this._prefix + cmd.toLowerCase()
        if ( typeof this[methodName] === 'function' ) {
            this[methodName](data)
                .then(resp => port.postMessage(this.sendSuccess(resp)))
                .catch(err => port.postMessage(this.sendError(err)))
        } else {
            const err = new Error( `Unrecognized command ${cmd}` )
            err.code = 'ERECOGNIZE'

            port.postMessage(this.sendError(err))
        }
    }

    /*
    * Действие при получении ошибки потока воркера
    * */
    _onError(error, logger) {
        logger( `%o`, error )
    }

    /*
    * Пример обработчика команды. На команду PING он возвращает PONG.
    * */
    remote_ping(data) {
        return new Promise(((resolve, reject) => {
            resolve('PONG')
        }))
    }
}

module.exports = ThreadsManager

`use strict`
const debug = require('debug')('index')
const { ThreadsManager } = require('./index')

const threads = new ThreadsManager('./example-worker.js', { stderr: false, stdout: false })

const limitWorkers = 1

threads.add(limitWorkers)

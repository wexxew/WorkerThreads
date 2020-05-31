`use strict`
const { WorkerThread } = require('./index')

const wrk = new WorkerThread()
async function main() {
    let result

    try {
        result = await wrk.sendCommand()
    } catch (e) {
        throw e
    }

    console.log( result )
    process.exit( 0 )
}

main()
    .catch( e => {
        console.log( `Got an error: ${e.message}` )
        process.exit(1)
    } )

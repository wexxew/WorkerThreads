`use strict`
const { WorkerThread } = require('./index')

const wrk = new WorkerThread()
async function main() {
    console.log( await wrk.sendCommand() )
}

main()
    .catch( e => {
        console.log( `Got an error: ${e.message}` )
    } )

setTimeout( () => process.exit( 0 ), 3000 )

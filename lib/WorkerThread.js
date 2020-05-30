`use strict`
const {parentPort, MessageChannel} = require( 'worker_threads' )

class WorkerThread {
    sendCommand( cmd = "PING", data = {} ) {
        const {port1, port2} = new MessageChannel();

        return new Promise( ( resolve, reject ) => {
            port1.once( 'message', packet => {
                if ( packet.status === 'error' ) {
                    const error = new Error( packet.message )

                    if ( packet.code ) {
                        error.code = packet.code
                    }

                    return reject( error )
                } else if ( packet.status === 'success' ) {
                    return resolve( packet.data )
                } else {
                    const error = new Error( 'Incorrect packet' )
                    error.code = 'EPACKET'
                    throw error
                }
            } )

            const packet = {cmd, data}
            packet.port = port2

            parentPort.postMessage( packet, [port2] )
        } )
    }
}

module.exports = WorkerThread

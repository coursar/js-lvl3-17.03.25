const { status, Server, ServerCredentials } = require('@grpc/grpc-js');
const { EventServiceService } = require('./event_grpc_pb');
const { EventRequest, EventResponse } = require('./event_pb');
const { Readable, Writable, Duplex } = require('node:stream');

/**
* @param {EventEmitter} call
* @param {function(Error, EventResponse)} callback
*/
function unary(call, callback) {
    const { request, metadata } = call;
    console.log(request.getId(), request.getData());
    if (request.getId() < 0) {
        callback({code: status.INVALID_ARGUMENT, details: 'invalid id'});
        return;
    }
    const response = new EventResponse();
    response.setId(1);
    response.setData('response');
    callback(null, response);
}

/**
 * @param {Writable} call
 */
function serverStream(call) {
    const { request } = call;
    console.log(request.getId(), request.getData());
    if (request.getId() < 0) {
        call.emit('error', {code: status.INVALID_ARGUMENT, details: 'invalid id'});
        return;
    }
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const response = new EventResponse();
            response.setId(i + 1);
            response.setData('response');

            call.write(response);
        }, i * 1000);
    }
    setTimeout(() => {
        call.end();
    }, 10_000);
}

/**
* @param {Readable} call
* @param {function(Error, EventResponse)} callback
*/
function clientStream(call, callback) {
    call.on('data', (request) => {
        console.log(request.getId(), request.getData());
    });
    call.on('end', () => {
        const response = new EventResponse();
        response.setId(1);
        response.setData('response');
        callback(null, response);
    });
}

/**
 * @param {Duplex} call
 */
function bidirectionalStream(call) {
    call.on('data', (request) => {
        console.log(request.getId(), request.getData());
    });

    call.on('end', () => {
        call.end();
    });

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const response = new EventResponse();
            response.setId(i + 1);
            response.setData('response');

            call.write(response);
        }, i * 1000);
    }
}

const server = new Server();
server.addService(EventServiceService, { unary, serverStream, clientStream, bidirectionalStream });
server.bindAsync('0.0.0.0:9999', ServerCredentials.createInsecure(), (error) => {
    if (error) {
        console.error(error);
        return;
    }
});
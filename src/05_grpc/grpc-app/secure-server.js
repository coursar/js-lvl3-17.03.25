const fs = require('node:fs');
const path = require('node:path');
const { status, Server, ServerCredentials, ServerListenerBuilder, ResponderBuilder, ServerInterceptingCall } = require('@grpc/grpc-js');
const { EventServiceService } = require('./event_grpc_pb');
const { EventRequest, EventResponse } = require('./event_pb');
const { Readable, Writable, Duplex } = require('node:stream');

/**
* @param {EventEmitter} call
* @param {function(Error, EventResponse)} callback
*/
function unary(call, callback) {
    // https://github.com/grpc/proposal/blob/master/L35-node-getAuthContext.md
    const { request } = call;
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

const creds = ServerCredentials.createSsl(
    fs.readFileSync(path.resolve(__dirname, '../../../tls/ca.crt')),
    [{
        cert_chain: fs.readFileSync(path.resolve(__dirname, '../../../tls/server.crt')),
        private_key: fs.readFileSync(path.resolve(__dirname, '../../../tls/server.key')),
    }],
    true,
);
const server = new Server();
server.addService(EventServiceService, { unary });
server.bindAsync('0.0.0.0:9999', creds, (error) => {
    if (error) {
        console.error(error);
        return;
    }
});
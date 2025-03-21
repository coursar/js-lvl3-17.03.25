const fs = require('node:fs');
const path = require('node:path');
const { credentials } = require('@grpc/grpc-js');
const { EventServiceClient } = require('./event_grpc_pb');
const { EventRequest, EventResponse } = require('./event_pb');

const creds = credentials.createSsl(
    fs.readFileSync(path.resolve(__dirname, '../../../tls/ca.crt')), 
    fs.readFileSync(path.resolve(__dirname, '../../../tls/admin.key')), 
    fs.readFileSync(path.resolve(__dirname, '../../../tls/admin.crt')),
);

const client = new EventServiceClient('server.local:9999', creds);

// // unary
const request = new EventRequest();
request.setId(1);
request.setData('request');
client.unary(request, (error, response) => {
    if (error) {
        console.error(error);
        return;
    }
    console.log(response.getId(), response.getData());
});
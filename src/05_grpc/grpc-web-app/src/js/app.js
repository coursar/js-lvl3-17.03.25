const {EventServiceClient} = require('./event_grpc_web_pb');
const {EventRequest, EventResponse} = require('./event_pb');

const client = new EventServiceClient('http://localhost:8080');

const request = new EventRequest();
request.setId(1);
request.setData('requrest');

client.unary(request, {"app-token": "secret"}, (err, response) => {
    if (err) {
        console.warn(err);
        return;
    }

    console.log(response.getId(), response.getData());
});

// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
// https://github.com/grpc/grpc-web/blob/master/javascript/net/grpc/web/grpcwebclientreadablestream.js
// const call = client.serverStream(request, null);
// call.on('data', (response) => {
//     console.log(response.getId(), response.getData());
// });
// call.on('end', () => {
//     console.log('end');
// })
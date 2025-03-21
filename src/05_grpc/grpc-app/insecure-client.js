const { credentials } = require('@grpc/grpc-js');
const { EventServiceClient } = require('./event_grpc_pb');
const { EventRequest, EventResponse } = require('./event_pb');

const client = new EventServiceClient('localhost:9999', credentials.createInsecure());

// // unary
// const request = new EventRequest();
// request.setId(1);
// request.setData('request');
// client.unary(request, (error, response) => {
//     if (error) {
//         console.error(error);
//         return;
//     }
//     console.log(response.getId(), response.getData());
// });

// // unary error
// const request = new EventRequest();
// request.setId(-1);
// request.setData('request');
// client.unary(request, (error, response) => {
//     if (error) {
//         console.error(error);
//         return;
//     }
//     console.log(response.getId(), response.getData());
// });

// // server streaming
// const request = new EventRequest();
// request.setId(1);
// request.setData('request');
// const call = client.serverStream(request);
// call.on('data', function (response) {
//     console.log(response.getId(), response.getData());
// });
// call.on('end', () => console.log('end'));

// setTimeout(() => {
//     const request = new EventRequest();
//     request.setId(1);
//     request.setData('request');
//     client.unary(request, (error, response) => {
//         if (error) {
//             console.error(error);
//             return;
//         }
//         console.log(response.getId(), response.getData());
//     });
// }, 2500);

// // server streaming error
// const request = new EventRequest();
// request.setId(-1);
// request.setData('request');
// const call = client.serverStream(request);
// call.on('data', (response) => {
//     console.log(response.getId(), response.getData());
// });
// call.on('error', (error) => {
//     console.error(error);
// });
// call.on('end', () => console.log('end'));

// setTimeout(() => {
//     const request = new EventRequest();
//     request.setId(1);
//     request.setData('request');
//     client.unary(request, (error, response) => {
//         if (error) {
//             console.error(error);
//             return;
//         }
//         console.log(response.getId(), response.getData());
//     });
// }, 2500);

// // client streaming
// const call = client.clientStream((error, response) => {
//     if (error) {
//         console.error(error);
//         return;
//     }

//     console.log(response.getId(), response.getData());
// });

// for (let i = 0; i < 5; i++) {
//     setTimeout(() => {
//         const request = new EventRequest();
//         request.setId(i + 1);
//         request.setData('request');
//         call.write(request);
//     }, i * 1000);
// }
// setTimeout(() => call.end(), 10_000);

// bidirectional streaming

const call = client.bidirectionalStream();

call.on('data', function (response) {
    console.log(response.getId(), response.getData());
});

call.on('end', () => console.log('end'));

for (let i = 0; i < 5; i++) {
    setTimeout(() => {
        const request = new EventRequest();
        request.setId(i + 1);
        request.setData('request');
        call.write(request);
    }, i * 1000);
}
setTimeout(() => call.end(), 10_000);
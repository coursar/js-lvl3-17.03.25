import net from 'node:net';

const server = new net.Server();

// client -> tcp -> http 0.9 request
// server.on('connection')

server.on('connection', (socket) => {
    // http 0.9 -> single line request
    // GET /index.html\r\n <-> GET /index.html\n
    // ArrayBuffer, Uint8Array, DataView -> Buffer (Node.js)

    // response
    // <html>...</html>
    // close connection

    let parsed = false;
    /** @type {[Buffer]} */
    const chunks = [];
    socket.on('data', (data) => { // Buffer
        const lfIndex = data.indexOf('\n');
        if (lfIndex === -1) {
            chunks.push(data);
            return;
        }

        parsed = true;
        const lastChunk = data.subarray(0, lfIndex + 1);
        chunks.push(lastChunk);

        const request = Buffer.concat(chunks).toString('utf-8');
        console.log(request);

        socket.end(`<html>
            <head><title>HTTP 0.9 response</title></head>
            <body>HTTP 0.9</body>
        </html>`)
    });
});

server.listen(9999);
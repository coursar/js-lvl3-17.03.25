import fs from 'node:fs';
import tls from 'node:tls';

const options = {
    key: fs.readFileSync('/home/student/Projects/js-lvl3-17.03.25/tls/server.key'), // no password
    cert: fs.readFileSync('/home/student/Projects/js-lvl3-17.03.25/tls/server.crt'),
};

const server = tls.createServer(options);

const handler = (req) => {
    const {socket} = req;

    if (req.url === '/index.html') {
        const bodyBuffer = Buffer.from(`<html>
            <head><title>HTTP 1.1 response</title></head>
            <body>HTTP 1.1 <img src="img.svg"></body>
        </html>`, 'utf-8');
        socket.write('HTTP/1.1 200 OK\r\n');
        socket.write('Content-Type: text/html\r\n');
        socket.write(`Content-Length: ${bodyBuffer.byteLength}\r\n`);
        socket.write('Connection: keep-alive\r\n'); // !important
        socket.write('\r\n'); // !important
        socket.write(bodyBuffer);
        return;
    }

    if (req.url === '/img.svg') {
        const bodyBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>`, 'utf-8');
        socket.write('HTTP/1.1 200 OK\r\n');
        socket.write('Content-Type: image/svg+xml\r\n');
        socket.write(`Content-Length: ${bodyBuffer.byteLength}\r\n`);
        socket.write('Connection: keep-alive\r\n'); // !important
        socket.write('\r\n'); // !important
        socket.write(bodyBuffer);
        return;
    }

    const bodyBuffer = Buffer.from(`<html>
        <head><title>HTTP 1.1 response</title></head>
        <body>Not Found</body>
    </html>`, 'utf-8');
    socket.write('HTTP/1.1 404 Not Found\r\n');
    socket.write('Content-Type: text/html\r\n');
    socket.write(`Content-Length: ${bodyBuffer.byteLength}\r\n`);
    socket.write('Connection: keep-alive\r\n'); // !important
    socket.write('\r\n'); // !important
    socket.write(bodyBuffer);
    return;
};

server.on('secureConnection', (socket) => {
    let requestLineAndHeadersBuffer = Buffer.alloc(4096); // request line + headers
    let offset = 0;
    let checkpoint = 0;
    /** @type {'new' | 'headers' | 'body' | 'handle'} */
    let stage = 'new'; // headers, body, handle
    let request = null;

    let contentLength = 0;

    let bodyOffset = 0;
    let bodyBuffer = Buffer.alloc(0);

    // working with single client in one tcp connection -> all data sequential
    socket.on('data', (data) => { // Buffer
        if (stage === 'new') {
            stage = 'headers';

            // FIXME: refactor & optimize
            requestLineAndHeadersBuffer = Buffer.alloc(4096); // request line + headers
            offset = 0;
            checkpoint = 0;
            request = null;

            contentLength = 0;

            bodyOffset = 0;
            bodyBuffer = Buffer.alloc(0);
        }

        if (stage === 'headers') {
            const copied = data.copy(requestLineAndHeadersBuffer, offset);

            const crlfcrlfIndex = requestLineAndHeadersBuffer.indexOf('\r\n\r\n');
            if (crlfcrlfIndex === -1) {
                offset += copied;
                checkpoint = offset - 4; // 4 length of '\r\n\r\n';
                return;
            }

            const requestLineEndIndex = requestLineAndHeadersBuffer.indexOf('\r\n') + 2;
            const headersEndIndex = crlfcrlfIndex + 4;

            const requestLine = requestLineAndHeadersBuffer.subarray(0, requestLineEndIndex).toString('utf-8').trim();
            // real life: multimap => k => [v1, v2]
            const headers = new Map(requestLineAndHeadersBuffer.subarray(requestLineEndIndex, headersEndIndex)
                .toString('utf-8')
                .split(/\r\n/g)
                .filter(o => o.trim()) // key: value
                .map(o => o.split(':', 2).map(p => p.trim())) // => [[k1, v1], [k2, v2]] => Map
            );
            // TODO: Content-Length -> modify
            contentLength = Number.parseInt(headers.get('Content-Length'), 10) || 0;

            const [method, url, version] = requestLine.split(' ', 3);

            request = {
                method,
                url,
                version,
                socket,
                headers,
                bodyBuffer, // by default = 0;
            }

            if (contentLength > 0) {
                // TODO: check for limit
                bodyBuffer = Buffer.alloc(contentLength);
                request.bodyBuffer = bodyBuffer;

                // TODO: check
                const bodyCopied = requestLineAndHeadersBuffer.copy(bodyBuffer, 0, headersEndIndex, offset + data.length);
                bodyOffset += bodyCopied;
                if (bodyCopied < contentLength) {
                    stage = 'body';
                    return;
                }
            }

            stage = 'handle';
        }

        if (stage === 'body') {
            const remain = contentLength - bodyOffset;
            const expect = Math.min(remain, data.length);
            const bodyCopied = data.copy(bodyBuffer, bodyOffset, 0, expect);
            bodyOffset += bodyCopied;

            if (bodyOffset === contentLength) {
                stage = 'handle';
            }
        }

        if (stage === 'handle') {
            handler(request);
            stage = 'new';
        }
    });
});

server.listen(9999);
// WARNING: for demo purpose only!
import { Server as HttpServer } from 'node:http';
import { Server as HttpsServer } from 'node:https';
import { createSecureServer as createHttp2Server } from 'node:http2';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { constants as BufferConstants } from 'node:buffer';

const watchers = new Set();
const watch = async () => {
    const watcher = fs.watch('./src', {recursive: true});
    for await (const event of watcher) {
        console.log(event);
        watchers.forEach((s) => s());
    }
};

const mimes = new Map([
    ['.html', 'text/html'],
    ['.css', 'text/css'],
    ['.xml', 'text/xml'],

    ['.js', 'application/javascript'],
    ['.mjs', 'application/javascript'],
    ['.json', 'application/json'],

    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpg'],
]);

const corsMiddleware = (next) => (req, res) => {
    console.log('cors');
    const { origin } = req.headers;
    if (!origin) {
        next(req, res);
        return;
    }

    // simple solution. see note for fetch: https://fetch.spec.whatwg.org/#http-new-header-syntax
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
    };

    if (req.method !== 'OPTIONS') {
        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
        try {
            next(req, res);
            return;
        } catch (e) {
            e.headers = { ...e.headers, ...headers };
            throw e;
        }
    }

    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
};

const jsonMiddleware = (next) => (req, res) => {
    console.log('json');
    if (!req.headers['content-type']?.startsWith('application/json')) {
        next(req, res);
        return;
    }

    const body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => {
        try {
            req.body = JSON.parse(Buffer.concat(body).toString('utf8'));
            req.bodyType = 'json';
        } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid json' }));
            return;
        }
        next(req, res);
    });
};

const blobMiddleware = (next) => (req, res) => {
    console.log('blob');

    const body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => {
        try {
            req.body = Buffer.concat(body);
            req.bodyType = 'blob';
        } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid image' }));
            return;
        }
        next(req, res);
    });
};

const blobSkipMiddleware = (next) => (req, res) => {
    console.log('blob skip');

    let bodyLength = 0;
    req.on('data',
        /**
         * @param {Buffer} chunk
         */
        (chunk) => bodyLength += chunk.byteLength
    );
    req.on('end', () => {
        try {
            req.bodyLength = bodyLength;
            req.bodyType = 'blobskip';
        } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid blob' }));
            return;
        }
        next(req, res);
    });
};

const formMiddleware = (next) => (req, res) => {
    console.log('form');
    if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
        next(req, res);
        return;
    }

    const body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => {
        try {
            req.body = new URLSearchParams(Buffer.concat(body).toString('utf8'));
            req.bodyType = 'form';
        } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid form' }));
            return;
        }
        next(req, res);
    });
};

const multipartMiddleware = (next) => (req, res) => {
    console.log('multipart');
    const CRLF = '\r\n';
    const CRLFCRLF = CRLF.repeat(2);
    const parsePart = (buffer) => {
        const part = { name: null, type: null, filename: null, content: null };

        const contentStartIndex = buffer.indexOf(CRLFCRLF);
        if (contentStartIndex === -1) {
            throw new Error('bad multipart: no content in part');
        }
        const contentEndIndex = buffer.indexOf(CRLF, contentStartIndex + CRLFCRLF.length);
        if (contentEndIndex === -1) {
            throw new Error('bad multipart: no content in part');
        }
        part.content = buffer.slice(contentStartIndex + CRLFCRLF.length, contentEndIndex);

        let index = 0;
        do {
            const headerEndIndex = buffer.indexOf(CRLF, index);
            const header = buffer.slice(index, headerEndIndex).toString();

            if (header.toLowerCase().startsWith('content-disposition')) {
                part.name = /name="(?<name>[^"]*)"/.exec(header).groups.name;
                part.filename = /filename="(?<filename>[^"]*)"/.exec(header)?.groups?.filename;
            }

            if (header.toLowerCase().startsWith('content-type')) {
                part.type = header.split(':')?.[1]?.trim() ?? 'unknown';
                switch (part.type) {
                    case 'text/plain':
                        part.content = part.content.toString('utf8');
                        break;
                    case 'application/json':
                        part.content = JSON.parse(part.content.toString('utf8'));
                        break
                }
            }
            // just ignore other headers for simplicity

            index = headerEndIndex + CRLF.length;
        } while (index < contentStartIndex);

        if (part.type === null) {
            // no Content-Type specified for text fields
            part.type = 'text/plain';
            part.content = part.content.toString('utf8');
        }
        return part;
    };

    const body = [];
    req.on('data', (chunk) => {
        body.push(chunk)
    });
    req.on('end', () => {
        try {
            const contentType = req.headers['content-type'];
            const buffer = Buffer.concat(body);
            const [, boundary] = contentType.split(';').map((o) => o.trim()).map((o) => o.replace('boundary=', ''))
            const startBoundary = `--${boundary}${CRLF}`;
            const startBoundaryIndex = buffer.indexOf(startBoundary);
            if (-1 === startBoundaryIndex) {
                throw new Error('invalid multipart');
            }
            const endBoundary = `--${boundary}--${CRLF}`;
            const endBoundaryIndex = buffer.indexOf(endBoundary);
            if (-1 === endBoundaryIndex || startBoundaryIndex > endBoundaryIndex) {
                throw new Error('invalid multipart');
            }

            const parsedParts = [];
            let index = startBoundaryIndex;
            do {
                const nextPartIndex = buffer.indexOf(startBoundary, index + startBoundary.length);
                if (nextPartIndex === -1) { // last part
                    const part = buffer.subarray(index, endBoundaryIndex);
                    const parsedPart = parsePart(part);
                    parsedParts.push([parsedPart.name, parsedPart]);
                    index = endBoundaryIndex;
                    break;
                }

                const part = buffer.subarray(index, nextPartIndex);
                const parsedPart = parsePart(part);
                parsedParts.push([parsedPart.name, parsedPart]);
                index = nextPartIndex;
            } while (index < endBoundaryIndex);

            req.body = {
                parts: parsedParts,
                entries() {
                    let lazyIndex = startBoundaryIndex;
                    return Iterator.from({
                        next() { // iterator protocol
                            if (lazyIndex >= endBoundaryIndex) {
                                throw new Error('no more items');
                            }

                            const nextPartIndex = buffer.indexOf(startBoundary, lazyIndex + startBoundary.length);
                            if (nextPartIndex === -1) { // last part
                                const part = buffer.subarray(lazyIndex, endBoundaryIndex);
                                const parsedPart = parsePart(part);
                                lazyIndex = endBoundaryIndex;
                                return {
                                    value: [parsedPart.name, parsedPart],
                                    done: true,
                                };
                            }

                            const part = buffer.subarray(lazyIndex, nextPartIndex);
                            const parsedPart = parsePart(part);
                            lazyIndex = nextPartIndex;
                            return {
                                value: [parsedPart.name, parsedPart],
                                done: false,
                            };
                        },
                    });
                },
            };
            req.bodyType = 'multipart';
        } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid multipart' }));
            return;
        }
        next(req, res);
    });
};

const slowMiddleware = (next) => (req, res) => {
    console.log('slow');
    setTimeout(() => next(req, res), 10000);
};

const sseReloadHandler = (req, res) => {
    if (!req.headers['accept']?.startsWith('text/event-stream')) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'bad request' }));
        return;
    }

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.flushHeaders();

    const subscriber = () => {
        res.write(Buffer.from('event: message\ndata: reload\n\n', 'utf8'));
    };
    watchers.add(subscriber);

    req.on('close', () => {
        watchers.delete(subscriber);
    });
};

const staticHandler = async (req, res) => {
    const filePath = path.normalize(path.join('./src', req.url));
    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'forbidden' }));
            return;
        }
    } catch (e) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'not found' }));
        return;
    }

    try {
        const ext = path.extname(filePath);
        const mime = mimes.get(ext) ?? 'application/octet-stream';
        const content = await fs.readFile(filePath);

        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        res.end(content);
    } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'can\t read file' }));
        return;
    }
};

const longPollingClients = new Set();
const longPollingHandler = (req, res) => {
    const subscriber = (data) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data }));
        return;
    };
    const timeoutId = setTimeout(() => {
        subscriber(null)
    }, 30_000);

    longPollingClients.add(subscriber);

    req.on('close', () => {
        longPollingClients.delete(subscriber);
        clearTimeout(timeoutId);
    });
};

const sseClients = new Set();
const sseHandler = (req, res) => {
    // if (!req.headers['accept']?.startsWith('text/event-stream')) {
    //     res.statusCode = 400;
    //     res.setHeader('Content-Type', 'application/json');
    //     res.end(JSON.stringify({ error: 'bad request' }));
    //     return;
    // }

    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.flushHeaders();

    const subscriber = (data) => {
        res.write(Buffer.from(`id:${Date.now()}\nevent: message\ndata: ${data}\n\n`, 'utf8'));
        // res.write(Buffer.from(`id:${Date.now()}\nevent: message\n`, 'utf8'));
        // setTimeout(() => res.write(Buffer.from(`data: ${data}\n\n`, 'utf8')), 5000);
    };
    sseClients.add(subscriber);

    req.on('close', () => {
        sseClients.delete(subscriber);
    });
};

const wsClients = new Set();
const wsHandler = (req, socket, head) => {
    // headers: upgrade, connection, sec-websocket-key 
    const upgrade = req.headers['upgrade'];
    const connection = req.headers['connection'];
    const wsKey = req.headers['sec-websocket-key'];
    const wsVersion = req.headers['sec-websocket-version'];

    if (req.method !== 'GET') {
        socket.write(`HTTP/1.1 405 Method Not Allowed\r\n\r\n`);
        socket.destroy();
        return;
    }

    if (upgrade?.toLowerCase() !== 'websocket') {
        console.debug('upgrade != websocket');
        socket.write(`HTTP/1.1 400 Bad Request\r\n\r\n`);
        socket.destroy();
        return;
    }

    if (connection !== 'Upgrade') {
        console.debug('connection != Upgrade');
        socket.write(`HTTP/1.1 400 Bad Request\r\n\r\n`);
        socket.destroy();
        return;
    }

    console.log(head.toString('hex'));
    const digest = crypto.hash('sha1', wsKey.trim() + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'base64');

    socket.write(`HTTP/1.1 101 Switching Protocols\r\n`);
    socket.write(`Upgrade: websocket\r\n`);
    socket.write(`Connection: Upgrade\r\n`);
    socket.write(`Sec-WebSocket-Accept: ${digest}\r\n`)
    socket.write(`\r\n`);
    wsClients.add(socket);

    socket.on('error', (err) => {
        console.error('error', err);
    });
    socket.on('close', () => {
        console.log('connection closed');
        wsClients.delete(socket);
    });

    // TODO: simplified version (many functions not supported)
    socket.on('data', (data) => {
        console.log('data');
        let consumed = 0;

        // [fin, RSV1, RSV2, RSV3, 4 bytes opcode] [masked, ...]
        const fin = (data[consumed] & 0b1000_0000) === 0b1000_0000;
        const opcode = data[consumed] & 0b0000_1111;
        consumed += 1;

        if (opcode !== 0b0000_0001 && opcode !== 0b0000_0010) {
            console.error('only text & binary frames supported');
            socket.destroy();
            return;
        }

        const masked = (data[consumed] & 0b1000_0000) === 0b1000_0000;
        if (!masked) {
            // https://datatracker.ietf.org/doc/html/rfc6455#section-5.1
            console.error('client data should be masked');
            socket.destroy();
            return;
        }

        let length = data[consumed] & 0b0111_1111;
        consumed += 1;
        if (length >= 0 && length <= 125) {
            // we are done, nothing to do
        } else if (length === 126) { // next 2 bytes
            length = data.readUIntBE(consumed, 2);
            consumed += 2;
        } else if (length === 127) { // next 8 bytes
            // first bit must be zero
            if ((data[consumed] & 0b1000_000) !== 0b0000_0000) {
                console.error('invalid payload format, first bit must be zero');
                socket.destroy();
                return;
            }
            length = data.readBigUInt64BE(consumed, 8);
            if (length > Number.MAX_SAFE_INTEGER || length > BufferConstants.MAX_LENGTH) {
                console.error('too big message, we not support it');
                socket.destroy();
                return;
            }
            length = Number(length);
            consumed += 8;
        } else {
            console.error('invalid payload length');
            socket.destroy();
            return;
        }

        const key = data.subarray(consumed, consumed + 4);
        consumed += 4;

        const encoded = data.subarray(consumed, consumed + length);
        consumed += length;

        const decoded = Buffer.alloc(length);

        for (let i = 0; i < encoded.length; i++) {
            decoded[i] = encoded[i] ^ key[i % 4];
        }

        const message = opcode === 2 ? decoded : decoded.toString('utf8');
        console.log(message);
    });
};

class Router {
    constructor(...middlewares) {
        this.middlewares = middlewares.toReversed();
        this.routes = new Map();
        this.notFoundHandler = [...this.middlewares]
            .reduce((prev, curr) => curr(prev), (req, res) => this.constructor.json(req, res, {
                code: 404,
                body: { error: 'not found' },
            }));
        this.internalErrorHandler = [...this.middlewares]
            .reduce((prev, curr) => curr(prev), (req, res) => this.constructor.json(req, res, {
                code: 500,
                body: { error: 'internal error' },
            }));

        this.variablePattern = /\{([^/]+)\}/g;
        this.variablePatternReplacement = '(?<$1>[^/]+)';
        this.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'CUSTOM'];
    }

    register(method, path, handler, ...middlewares) {
        this.#checkMethod(method);
        this.#checkPath(path);

        if (typeof path === 'string' && path.match(this.variablePattern)) {
            const replaced = path.replaceAll(this.variablePattern, this.variablePatternReplacement)
            path = new RegExp(replaced)
        }

        console.log(path)

        const wrapped = [...middlewares.toReversed(), ...this.middlewares]
            .reduce((prev, curr) => curr(prev), handler);
        if (!this.routes.has(method)) {
            this.routes.set(method, new Map([[path, wrapped]]));
            return;
        }
        this.routes.get(method).set(path, wrapped);
    }

    handle(req, res) {
        if (!this.routes.has(req.method)) {
            this.notFoundHandler(req, res);
            return;
        }

        req.parsedUrl = new URL(`http://localhost${req.url}`);

        const route = [...this.routes.get(req.method).entries()]
            .find(([k, _]) => (k instanceof RegExp ? k.test(req.url) : k === req.parsedUrl.pathname));

        if (!route) {
            this.notFoundHandler(req, res);
            return;
        }

        const [path, handler] = route;
        try {
            if (path instanceof RegExp) {
                req.params = path.exec(req.url);
            }
            handler(req, res);
        } catch (e) {
            console.error(e);
            this.internalErrorHandler(req, res);
        }
    }

    #checkMethod(method) {
        if (!this.allowedMethods.includes(method)) {
            throw new Error('invalid method');
        }
    }

    #checkPath(path) {
        if (typeof path === 'string') {
            if (!path.startsWith('/')) {
                throw new Error('path must start with /');
            }
            return;
        }

        if (path instanceof RegExp) {
            if (!path.source.startsWith('^\\/') || !path.source.endsWith('$')) {
                throw new Error('path must start with ^/ and ends with $');
            }
            return;
        }

        throw new Error('path must be string or RegExp');
    }

    static json(req, res, { code = 200, contentType = 'application/json', data }) {
        res.statusCode = code;
        res.setHeader('Content-Type', contentType);
        res.end(JSON.stringify(data));
    }
};

const router = new Router(corsMiddleware);
router.register('GET', /^\/(?!api\/).*$/, staticHandler);
router.register('GET', '/api/reload', sseReloadHandler);

router.register('POST', '/api/test/blob', (req, res) => {
    console.log(req.headers['x-total-parts'], req.headers['x-part-no'])
    res.writeHead(200);
    res.end('ok');
}, blobMiddleware);

router.register('GET', '/api/test/chunked', (req, res) => {
    res.writeHead(200, {
        'content-type': 'application/magic',
    });
    res.flushHeaders();

    setTimeout(() => {
        res.write('first line\n');
    }, 5000);

    setTimeout(() => {
        res.write('second line\n');
    }, 10_000);

    setTimeout(() => {
        res.end('last line\n');
    }, 15_000);
});

router.register('POST', '/api/test/progress', (req, res) => {
    res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': 90, // => HTTP/1.1 Transfer-Encoding: chunked
    });
    res.flushHeaders();

    setTimeout(() => {
        res.write('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    }, 5000);

    setTimeout(() => {
        res.write('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    }, 10_000);

    setTimeout(() => {
        res.write('cccccccccccccccccccccccccccccc');
    }, 15_000);
});

// GET/POST/other
router.register('GET', '/api/test/poll', (req, res) => {
    console.log('new poll request');
    res.writeHead(200);
    res.end('no updates');
});
// GET/POST/other
router.register('GET', '/api/test/long-poll', longPollingHandler);

// only GET
router.register('GET', '/api/test/sse', sseHandler);


router.register('GET', '/api/test/message', (req, res) => {
    longPollingClients.forEach((client) => client('message'));

    sseClients.forEach((client) => client('message'));

    wsClients.forEach((client) => {
        const message = Buffer.from('message');
        try {
            let produced = 0;
            let response;
            if (message.length <= 125) {
                response = Buffer.alloc(1 + 1 + message.length);
                response[produced] = 0b1000_0001; // fin + opcode text
                produced += 1;
                response[produced] = message.length; // no masking
                produced += 1;
                message.copy(response, produced);
                produced += message.length;
            } else if (message.length <= 2 ** 16 - 1) {
                response = Buffer.alloc(1 + 1 + 2 + message.length);
                response[produced] = 0b1000_0001; // fin + opcode text
                produced += 1;
                response[produced] = 126; // magic number for uint16 payload length
                produced += 1;
                response.writeUIntBE(message.length, produced, 2)
                produced += 2;
                message.copy(response, produced);
                produced += message.length;
            } else if (message.length <= 2 ** (64 - 1)) { // first bit must be zero
                response = Buffer.alloc(1 + 1 + 8 + message.length);
                response[produced] = 0b1000_0001; // fin + opcode text
                produced += 1;
                response[produced] = 127; // magic number for uint16 payload length
                produced += 1;
                response.writeBigUInt64BE(BigInt(message.length), produced, 8)
                produced += 8;
                message.copy(response, produced);
                produced += message.length;
            } else {
                throw new Error('message too big');
            }

            client.write(response);
        } catch (e) {
            console.error(e);
        }
    });

    Router.json(req, res, { data: { value: 'ok' } });
}, jsonMiddleware);

const httpServer = new HttpServer();
httpServer.on('connection', (conn) => {
    conn.pipe(process.stdout);
});
httpServer.on('request', (req, res) => router.handle(req, res));
httpServer.on('upgrade', wsHandler);
httpServer.on('error', (err) => {
    console.error(err);
    httpServer.close();
});
httpServer.on('close', () => {
    console.info('server down');
});
httpServer.listen(9999, '0.0.0.0', () => {
    const address = httpServer.address();
    console.info(`listening on: ${address.address}:${address.port}`);
    watch();
});

const tlsOpts = {
    key: await fs.readFile('tls/server.key'),
    cert: await fs.readFile('tls/server.crt'),
    rejectUnauthorized: false,
    requestCert: true,
    ca: await fs.readFile('tls/ca.crt'),
};

const httpsServer = new HttpsServer(tlsOpts);
httpsServer.on('connection', (conn) => {
    conn.pipe(process.stdout);
});
httpsServer.on('request', (req, res) => router.handle(req, res));
httpsServer.on('upgrade', wsHandler);
httpsServer.on('error', (err) => {
    console.error(err);
    httpsServer.close();
});
httpsServer.on('close', () => {
    console.info('server down');
});
httpsServer.listen(9499, '0.0.0.0', () => {
    const address = httpsServer.address();
    console.info(`listening on: ${address.address}:${address.port}`);
});

const http2Server = createHttp2Server(tlsOpts);
http2Server.on('request', (req, res) => router.handle(req, res));
http2Server.on('upgrade', wsHandler);
http2Server.on('error', (err) => {
    console.error(err);
    http2Server.close();
});
http2Server.on('close', () => {
    console.info('server down');
});
http2Server.listen(9599, '0.0.0.0', () => {
    const address = http2Server.address();
    console.info(`listening on: ${address.address}:${address.port}`);
});
import net from 'node:net';

import * as prepared from '../prepared/h2hardcoded.mjs';

const server = new net.Server();

// enum
const FRAME_TYPES = Object.freeze({
   DATA: 0x00,
   HEADERS: 0x01,
   SETTINGS: 0x04, 
   GOAWAY: 0x07, // not full support
});

server.on('connection', (socket) => {
    /** @type {'http11' | 'http20'} */
    let connection = 'http11';

    const http11Data = {
        requestLineAndHeadersBuffer: Buffer.alloc(4096), // request line + headers
        offset: 0,
        checkpoint: 0,
        /** @type {'new' | 'headers' | 'body' | 'handle'} */
        stage: 'new', // headers, body, handle
        request: null,

        contentLength: 0,

        bodyOffset: 0,
        bodyBuffer: Buffer.alloc(0),
    }

    const http20Data = {
        magicBuffer: Buffer.alloc(24),
        offset: 0,
        checkpoint: 0,
        /** @type {'new' | 'newFrame' | 'frameHeader' | 'frameBody' | 'handleFrame'} */
        stage: 'new',

        frameType: -1,

        frameHeadersBuffer: Buffer.alloc(9),
        frameHeadersOffset: 0,

        frameBodyLengthBuffer: Buffer.alloc(4),
        frameBodyLength: 0,

        frameBodyBuffer: Buffer.alloc(0),
        frameBodyOffset: 0,
    }

    const http20Handler = (data) => {
        if (connection !== 'http20') {
            console.error('wrong connection value (should be http20), but:', connection);
            socket.destroy();
            return;
        }
        
        if (http20Data.stage === 'new') {
            // TODO: magic
            const remain = 24 - http20Data.offset;
            const expect = Math.min(remain, data.length);
            const copied = data.copy(http20Data.magicBuffer, http20Data.offset, 0, expect);
            // TODO: handle partial send
            http20Data.offset += copied;
            if (http20Data.offset === 24) {
                const prefaceIdx = http20Data.magicBuffer.indexOf('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n');
                if (prefaceIdx !== 0) {
                    console.error('no preface');
                    socket.destroy();
                }

                // TODO: handle url from upgrade
                // 1. settings frame
                {
                    socket.write(prepared.initialSettings);
                }
                // emulate response
                // 2. headers frame
                {
                    const frameHeader = Buffer.alloc(9);

                    const frameHeaderLengthBuffer = Buffer.alloc(4);
                    frameHeaderLengthBuffer.writeUint32BE(1, 0); // [0x00, 0xXX, 0xXX, 0xXX]
                    frameHeaderLengthBuffer.copy(frameHeader, 0, 1); 

                    frameHeader.writeUint8(FRAME_TYPES.HEADERS, 3);

                    const flags = 0x04; // END_HEADERS
                    frameHeader.writeUint8(flags, 4);

                    // => Stream Identifier (31), from upgrade: 0x01
                    frameHeader.writeUInt32BE(0x01, 5); // [0, 31]
                    socket.write(frameHeader);

                    const frameBody = Buffer.alloc(1);
                    frameBody.writeUint8(0x88); // :status: 200

                    socket.write(frameBody);
                }
                // 3. body frame 
                {
                    const frameHeader = Buffer.alloc(9);

                    const body = Buffer.from(`<html>
                        <head><title>HTTP 2</title></head>
                        <body>HTTP2</body>
                    </html>`);

                    const frameHeaderLengthBuffer = Buffer.alloc(4);
                    frameHeaderLengthBuffer.writeUint32BE(body.byteLength, 0); // [0x00, 0xXX, 0xXX, 0xXX]
                    frameHeaderLengthBuffer.copy(frameHeader, 0, 1); 

                    frameHeader.writeUint8(FRAME_TYPES.DATA, 3);

                    const flags = 0x01; // END_STREAM
                    frameHeader.writeUint8(flags, 4);

                    // => Length (24),
                    // => Type (8),
                    // => Flags (8),
                    // => Reserved (1),
                    // => Stream Identifier (31), from upgrade: 0x01
                    frameHeader.writeUInt32BE(0x01, 5); // [0, 31]
                    socket.write(frameHeader);

                    socket.write(body);
                }

                // data: PRI ...<frame><frame>
                data = data.subarray(24);
                // data: <frame><frame>
                http20Data.stage = 'newFrame';
            }
        }

        while (data.length !== 0) {
            // HTTP request analogue -> frameHeader (9 byte) + framePayload (length)
            if (http20Data.stage === 'newFrame') {
                http20Data.frameHeadersBuffer = Buffer.alloc(9); // TODO: reuse
                http20Data.frameHeadersOffset = 0;

                http20Data.frameType = -1;

                http20Data.frameBodyLength = 0;

                http20Data.frameBodyBuffer = Buffer.alloc(0);
                http20Data.frameBodyOffset = 0;

                http20Data.stage = 'frameHeader';
            }

            if (http20Data.stage === 'frameHeader') {
                /*
                HTTP Frame {
                    => Length (24),
                    => Type (8),
                    => Flags (8),
                    => Reserved (1),
                    => Stream Identifier (31),
    
                    Frame Payload (..),
                }
                */
                const remain = 9 - http20Data.frameHeadersOffset;
                const expect = Math.min(remain, data.length);
                const copied = data.copy(http20Data.frameHeadersBuffer, http20Data.frameHeadersOffset, 0, expect);
                // TODO: handle partial send
                http20Data.frameHeadersOffset += copied;
                if (http20Data.frameHeadersOffset === 9) {
                    // 24 bit = 3 byte
                    http20Data.frameBodyLengthBuffer[0] = 0x00;
                    http20Data.frameHeadersBuffer.subarray(0, 3).copy(http20Data.frameBodyLengthBuffer, 1);
                    http20Data.frameBodyLength = http20Data.frameBodyLengthBuffer.readUint32BE();
                    // Uint8Array, Buffer -> 8, 16, [-24-], 32, 64
                    // BE: [0x00, 0xXX, 0xXX, 0xXX] -> 4 -> 32 bit
                    // http20Data.frameHeadersBuffer.readUint32BE

                    if (http20Data.frameBodyLength === 0) {
                        http20Data.stage = 'handleFrame';
                    } else {
                        http20Data.frameBodyBuffer = Buffer.alloc(http20Data.frameBodyLength);
                        http20Data.stage = 'frameBody';
                    }

                    http20Data.frameType = http20Data.frameHeadersBuffer.readUint8(3);

                    // <frameHeaders|frameBody><frame>
                    data = data.subarray(9);
                    // <|frameBody><frame>
                }
            }

            if (http20Data.stage === 'frameBody') {
                /*
                HTTP Frame {
                    Length (24),
                    Type (8),
                    Flags (8),
                    Reserved (1),
                    Stream Identifier (31),
    
                    => Frame Payload (..),
                }
                */
                const remain = http20Data.frameBodyLength - http20Data.frameBodyOffset;
                const expect = Math.min(remain, data.length);
                const copied = data.copy(http20Data.frameBodyBuffer, http20Data.frameBodyOffset, 0, expect);
                // TODO: handle partial send
                http20Data.frameBodyOffset += copied;
                if (http20Data.frameBodyOffset === http20Data.frameBodyLength) {
                    http20Data.stage = 'handleFrame';
                    // <|frameBody><frame>
                    data = data.subarray(http20Data.frameBodyOffset);
                }
            }

            if (http20Data.stage === 'handleFrame') {
                if (http20Data.frameType === FRAME_TYPES.SETTINGS) {
                    const ackFlag = (http20Data.frameHeadersBuffer.readUint8(4) & 0b0000_0001) !== 0;
                    if (!ackFlag) {
                        const settingsBuffer = Buffer.alloc(9);
                        settingsBuffer.writeUInt8(FRAME_TYPES.SETTINGS, 3);
                        settingsBuffer.writeUint8(0x01, 4); // ackFlag
                        socket.write(settingsBuffer);
                    }
                }
                if (http20Data.frameType === FRAME_TYPES.GOAWAY) {
                    socket.end(); // hard exit!
                    return
                }

                http20Data.stage = 'newFrame';
            }
        }
    };

    // working with single client in one tcp connection -> all data sequential
    const http11Handler = (data) => { // Buffer
        if (http11Data.stage === 'new') {
            http11Data.stage = 'headers';

            // FIXME: refactor & optimize
            http11Data.requestLineAndHeadersBuffer = Buffer.alloc(4096); // request line + headers
            http11Data.offset = 0;
            http11Data.checkpoint = 0;
            http11Data.request = null;

            http11Data.contentLength = 0;

            http11Data.bodyOffset = 0;
            http11Data.bodyBuffer = Buffer.alloc(0);
        }

        if (http11Data.stage === 'headers') {
            const copied = data.copy(http11Data.requestLineAndHeadersBuffer, http11Data.offset);

            const crlfcrlfIndex = http11Data.requestLineAndHeadersBuffer.indexOf('\r\n\r\n');
            if (crlfcrlfIndex === -1) {
                http11Data.offset += copied;
                http11Data.checkpoint = http11Data.offset - 4; // 4 length of '\r\n\r\n';
                return;
            }

            const requestLineEndIndex = http11Data.requestLineAndHeadersBuffer.indexOf('\r\n') + 2;
            const headersEndIndex = crlfcrlfIndex + 4;

            const requestLine = http11Data.requestLineAndHeadersBuffer.subarray(0, requestLineEndIndex).toString('utf-8').trim();
            // real life: multimap => k => [v1, v2]
            const headers = new Map(http11Data.requestLineAndHeadersBuffer.subarray(requestLineEndIndex, headersEndIndex)
                .toString('utf-8')
                .split(/\r\n/g)
                .filter(o => o.trim()) // key: value
                .map(o => o.split(':', 2).map(p => p.trim())) // => [[k1, v1], [k2, v2]] => Map
            );
            // TODO: Content-Length -> modify
            http11Data.contentLength = Number.parseInt(headers.get('Content-Length'), 10) || 0;

            const [method, url, version] = requestLine.split(' ', 3);

            http11Data.request = {
                method,
                url,
                version,
                socket,
                headers,
                bodyBuffer: http11Data.bodyBuffer, // refactor
            }

            if (http11Data.contentLength > 0) {
                // TODO: check for limit
                http11Data.bodyBuffer = Buffer.alloc(http11Data.contentLength);
                http11Data.request.bodyBuffer = http11Data.bodyBuffer;

                const bodyCopied = http11Data.requestLineAndHeadersBuffer.copy(http11Data.bodyBuffer, 0, headersEndIndex, http11Data.offset + data.length);
                http11Data.bodyOffset += bodyCopied;
                if (bodyCopied < http11Data.contentLength) {
                    http11Data.stage = 'body';
                    return;
                }
            }

            http11Data.stage = 'handle';
        }

        if (http11Data.stage === 'body') {
            const remain = http11Data.contentLength - http11Data.bodyOffset;
            const expect = Math.min(remain, data.length);
            const bodyCopied = data.copy(http11Data.bodyBuffer, http11Data.bodyOffset, 0, expect);
            http11Data.bodyOffset += bodyCopied;

            if (http11Data.bodyOffset === http11Data.contentLength) {
                http11Data.stage = 'handle';
            }
        }

        if (http11Data.stage === 'handle') {
            upgradeHandler(http11Data.request);
            http11Data.stage = 'new';
        }
    };

    socket.on('data', http11Handler); 

    const upgradeHandler = (req) => {
        const {socket} = req;

        /*
        HTTP/1.1 101 Switching Protocols
        Upgrade: foo/2
        Connection: Upgrade
        */

        // TODO: check request
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        socket.write(`Upgrade: h2c\r\n`);
        socket.write('Connection: Upgrade\r\n'); // !important
        socket.write('\r\n'); // !important

        connection = 'http20';
        // switch handlers
        socket.removeListener('data', http11Handler);
        socket.on('data', http20Handler);

        return;
    };
});

server.listen(9999);
import fs from 'node:fs';
import tls from 'node:tls';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as prepared from '../prepared/h2hardcoded.mjs';

const options = {
    key: fs.readFileSync(path.resolve(__dirname, '../tls/server.key')), // no password
    cert: fs.readFileSync(path.resolve(__dirname, '../tls/server.crt')),
    // mTLS (server don't trust by default to CA)
    ca: fs.readFileSync(path.resolve(__dirname, '../tls/ca.crt')),
    requestCert: true,
    rejectUnauthorized: false,
    ALPNProtocols: ['h2'],
};

const server = tls.createServer(options);


// enum
const FRAME_TYPES = Object.freeze({
   DATA: 0x00,
   HEADERS: 0x01,
   SETTINGS: 0x04, 
   GOAWAY: 0x07, // not full support
});

server.on('secureConnection', (socket) => {
    let connection = 'http20';
    // http11 -> upgrade -> h2c
    // http2 -> h2

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
                if (http20Data.frameType === FRAME_TYPES.HEADERS) {
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

                }

                http20Data.stage = 'newFrame';
            }
        }
    };

    socket.on('data', http20Handler); 
});

server.listen(9999);
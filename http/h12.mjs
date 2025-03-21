import { createSecureServer as createHttp2Server } from 'node:http2';
import crypto from 'node:crypto';
import fs from 'node:fs';

const tlsOpts = {
    key: fs.readFileSync('/home/student/Projects/js-lvl3-17.03.25/tls/server.key'), // no password
    cert: fs.readFileSync('/home/student/Projects/js-lvl3-17.03.25/tls/server.crt'),
    // ALPNProtocols: ['h2', 'http/1.1'],
    allowHTTP1: true,
};

const http2Server = createHttp2Server(tlsOpts);
http2Server.on('request', (req, res) => {
    const version = req.httpVersion;
    console.log(version);
    res.writeHead(200);
    res.end(`<h1>it works</h1>`);
});
http2Server.listen(9999, '0.0.0.0', () => {
    const address = http2Server.address();
    console.info(`listening on: ${address.address}:${address.port}`);
});
// import { createSecureServer as createServer } from 'node:http2';
// import { createServer } from 'node:https';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path'
import url from 'node:url'
import { buildSchema } from 'graphql';
// import { createHandler } from 'graphql-http/lib/use/http2';
import { createHandler } from 'graphql-http/lib/use/http';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schema = buildSchema(`
  type Product {
    id: Int!
    title: String!
    description: String!
  }

  type Query {
    products: [Product]
    hello: String
  }
`);

// The rootValue provides a resolver function for each API endpoint
const rootValue = {
    products: [
        {
            id: 1,
            title: 'War and Peace',
            description: '...',
        },
        {
            id: 2,
            title: 'Anna',
            description: '...',
        },
    ],

    hello() {
        return 'Hello world!';
    },
};

// Create the GraphQL over HTTP Node request handler
const handler = createHandler({ schema, rootValue });

const server = createServer({
    key: await fs.readFile(path.resolve(__dirname, '../../../tls/server.key')),
    cert: await fs.readFile(path.resolve(__dirname, '../../../tls/server.crt')),
});


server.on('request', async (req, res) => {
    if (req.url === '/index.html') {
        const html = await fs.readFile(path.resolve(__dirname, 'index.html'));
        res.writeHead(200, {'content-type': 'text/html'}).end(html);
        return;
    }

    if (!req.url.startsWith('/graphql')) {
        res.writeHead(404).end();
        return;
    }
    handler(req, res);
});

server.listen(9999);
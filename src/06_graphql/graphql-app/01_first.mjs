import { graphql, buildSchema } from 'graphql';

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
type Product {
    id: ID!
    title: String!
    description: String!
}

type Query {
    products: [Product]
    hello: String
}

input NewProductInput {
    title: String!
    description: String!
}

type Mutation {
    addProduct(input: NewProductInput!): Product!
}
`);

let nextId = 1;

// The rootValue provides a resolver function for each API endpoint
const rootValue = {
  products: [
    {
      id: nextId++,
      title: 'War and Peace',
      description: '...',
    },
    {
      id: nextId++,
      title: 'Anna',
      description: '...',
    },
  ],

  hello() {
    return 'Hello world!';
  },

  addProduct({ input }) {
    const product = {...input, id: nextId++};
    rootValue.products.push(product);
    return product;
  }
};

// Run the GraphQL query '{ hello }' and print out the response
{
  const response = await graphql({
    schema,
    source: `#graphql {
      hello
    }`,
    rootValue,
  });
  console.log(response);
}

{
  const response = await graphql({
    schema,
    source: `#graphql query {
      hello
    }`,
    rootValue,
  });
  console.log(response);
}

{
  const response = await graphql({
    schema,
    source: `#graphql {
      products {
        id
        title
      }
    }`,
    rootValue,
  });
  console.log(response);
}


{
  const response = await graphql({
    schema,
    source: `#graphql
    mutation {
      addProduct(input: {title: "js", description: "wow!"}) {
        id
        title
      }
    }
    `,
    rootValue,
  });
  console.log(response);
}

{
  const response = await graphql({
    schema,
    source: `#graphql
    query {
      products1: products {
        id
        title
      }
      products2: products {
        id
        title
      }
    }
    `,
    rootValue,
  });
  debugger;
  console.log(response);
}
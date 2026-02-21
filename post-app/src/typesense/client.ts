import Typesense from 'typesense';

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: Number(process.env.TYPESENSE_PORT) || 8108,
      protocol: 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 5,
});

export { typesenseClient };

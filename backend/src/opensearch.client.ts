/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Client } from '@opensearch-project/opensearch';

const password = process.env.OPENSEARCH_INITIAL_ADMIN_PASSWORD;
if (!password) {
  console.warn('OPENSEARCH_INITIAL_ADMIN_PASSWORD is not set: copy .env.example to .env and load it');
}

export const osClient = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'admin',
    password: password ?? '',
  },
  ssl: { rejectUnauthorized: false },
});

async function ping() {
  const { body } = await osClient.info();
  console.log('OpenSearch OK', (body as any).version.number);
}

void ping();

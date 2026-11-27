/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Client } from '@opensearch-project/opensearch';

const apiKey = process.env.OPENSEARCH_API_KEY;
if (!apiKey) {
  console.warn(
    'OPENSEARCH_API_KEY is not set: run scripts/setup-opensearch.sh and load .env',
  );
}

export const osClient = new Client({
  node: 'https://localhost:9200',
  headers: { Authorization: `ApiKey ${apiKey ?? ''}` },
  ssl: { rejectUnauthorized: false },
});

async function ping() {
  const { body } = await osClient.info();
  console.log('OpenSearch OK', (body as any).version.number);
}

void ping();

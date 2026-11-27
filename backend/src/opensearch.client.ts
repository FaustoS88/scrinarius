import { Provider } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

// Nest injects this client wherever a `Client` is asked for, authenticated with the key that scripts/setup-opensearch.sh writes to .env
export const openSearchClient: Provider = {
  provide: Client,
  useFactory: () => {
    const apiKey = process.env.OPENSEARCH_API_KEY;
    if (!apiKey) {
      console.warn(
        'OPENSEARCH_API_KEY is not set: run scripts/setup-opensearch.sh and load .env',
      );
    }
    return new Client({
      node: 'https://localhost:9200',
      headers: { Authorization: `ApiKey ${apiKey ?? ''}` },
      ssl: { rejectUnauthorized: false },
    });
  },
};

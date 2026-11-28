import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
  Provider,
} from '@nestjs/common';
import { Client, errors } from '@opensearch-project/opensearch';
import { Response } from 'express';

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
      node: process.env.OPENSEARCH_URL ?? 'https://localhost:9200',
      headers: { Authorization: `ApiKey ${apiKey ?? ''}` },
      ssl: { rejectUnauthorized: false },
    });
  },
};

// OpenSearch errors carry the request with its Authorization header, so only their name, status and message are logged
export function describeOpenSearchError(error: unknown): string {
  if (!(error instanceof errors.OpenSearchClientError)) return String(error);
  const status =
    error instanceof errors.ResponseError ? ` ${error.statusCode}` : '';
  return `${error.name}${status}: ${error.message}`;
}

@Catch(errors.OpenSearchClientError)
export class OpenSearchErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('OpenSearch');

  catch(error: errors.OpenSearchClientError, host: ArgumentsHost) {
    this.logger.error(describeOpenSearchError(error));
    const status =
      error instanceof errors.ResponseError ? error.statusCode : undefined;
    const response = host.switchToHttp().getResponse<Response>();
    // A 400 from OpenSearch means the caller's input was invalid, such as an offset past 10,000 hits or a repeated q
    if (status === 400) {
      response.status(400).json({ statusCode: 400, message: error.message });
    } else if (status === 429) {
      // OpenSearch is busy, for instance with two large uploads at once: the caller can try again
      response.status(429).json({
        statusCode: 429,
        message: 'OpenSearch is busy, try again',
      });
    } else {
      response
        .status(500)
        .json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}

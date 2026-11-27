import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { IndexDocumentDto } from './dto/index-document.dto';

const INDEX = 'documents';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly client: Client) {}

  // All the words of q in any field, or every document when q is empty
  async search(q: string, from: number, size: number): Promise<any[]> {
    const query = q
      ? {
          simple_query_string: {
            query: q,
            fields: ['*'],
            default_operator: 'and' as const,
          },
        }
      : { match_all: {} };

    try {
      const response = await this.client.search({
        index: INDEX,
        from: Math.max(from, 0),
        size: Math.min(size, 100),
        body: {
          query,
          // One fragment per hit, with the matched words wrapped in <em>
          highlight: {
            fields: { 'attachment.content': {}, body: {} },
            fragment_size: 160,
            number_of_fragments: 1,
          },
        },
      });
      return response.body.hits.hits;
    } catch (error: unknown) {
      this.logger.error(
        'Search error',
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      return [];
    }
  }

  // The attachments pipeline extracts the text of a base64 file in `data`; refresh makes the document searchable at once
  async index(doc: IndexDocumentDto): Promise<{ indexed: string }> {
    const id = doc.id ?? Date.now().toString();
    await this.client.index({
      index: INDEX,
      id,
      body: doc,
      pipeline: 'attachments',
      refresh: 'true',
    });
    return { indexed: id };
  }

  async deleteIndex(): Promise<any> {
    const response = await this.client.indices.delete({ index: INDEX });
    return response.body;
  }
}

import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { IndexDocumentDto } from './dto/index-document.dto';

const INDEX = 'documents';

@Injectable()
export class SearchService {
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

    const response = await this.client.search({
      index: INDEX,
      // Before the first upload there is no index: that is no hits, not an error
      ignore_unavailable: true,
      from: Math.max(from, 0),
      size: Math.min(Math.max(size, 0), 100),
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
  }

  // The attachments pipeline extracts the text of the file, which it reads as base64 from `data`; refresh makes the document searchable at once
  async index(
    doc: IndexDocumentDto,
    file?: Buffer,
  ): Promise<{ indexed: string }> {
    const id = doc.id ?? Date.now().toString();
    await this.client.index({
      index: INDEX,
      id,
      body: file ? { ...doc, data: file.toString('base64') } : doc,
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

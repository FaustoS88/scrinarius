import { Client } from '@opensearch-project/opensearch';
import { SearchService } from './search.service';

describe('SearchService', () => {
  const client = {
    search: jest.fn(),
    index: jest.fn(),
    indices: { delete: jest.fn() },
  };
  const service = new SearchService(client as unknown as Client);
  const noHits = { body: { hits: { hits: [] } } };

  beforeEach(() => jest.resetAllMocks());

  it('asks for the documents holding all the words, in any field, with one highlighted fragment each', async () => {
    const hits = [{ _id: 'harbour' }];
    client.search.mockResolvedValue({ body: { hits: { hits } } });

    await expect(service.search('harbour survey', 10, 20)).resolves.toBe(hits);
    expect(client.search).toHaveBeenCalledWith({
      index: 'documents',
      ignore_unavailable: true,
      from: 10,
      size: 20,
      body: {
        query: {
          simple_query_string: {
            query: 'harbour survey',
            fields: ['*'],
            default_operator: 'and',
          },
        },
        highlight: {
          fields: { 'attachment.content': {}, body: {} },
          fragment_size: 160,
          number_of_fragments: 1,
        },
      },
    });
  });

  it('lists every document when the query is empty', async () => {
    client.search.mockResolvedValue(noHits);

    await service.search('', 0, 50);
    const [[sent]] = client.search.mock.calls as [
      [{ body: { query: object } }],
    ];
    expect(sent.body.query).toEqual({ match_all: {} });
  });

  it.each([
    [-5, 500, 0, 100],
    [3, -1, 3, 0],
  ])(
    'sends from %i and size %i as %i and %i, within what OpenSearch accepts',
    async (from, size, sentFrom, sentSize) => {
      client.search.mockResolvedValue(noHits);

      await service.search('harbour', from, size);
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ from: sentFrom, size: sentSize }),
      );
    },
  );

  it('lets an OpenSearch failure reach the caller instead of answering no hits', async () => {
    client.search.mockRejectedValue(new Error('connection refused'));

    await expect(service.search('harbour', 0, 50)).rejects.toThrow(
      'connection refused',
    );
  });

  it('indexes the file as base64 through the attachments pipeline and makes the document searchable at once', async () => {
    const doc = { id: 'harbour', title: 'harbour.pdf' };
    client.index.mockResolvedValue({ body: { _id: 'harbour' } });

    await expect(service.index(doc, Buffer.from('%PDF-'))).resolves.toEqual({
      indexed: 'harbour',
    });
    expect(client.index).toHaveBeenCalledWith({
      index: 'documents',
      id: 'harbour',
      body: { id: 'harbour', title: 'harbour.pdf', data: 'JVBERi0=' },
      pipeline: 'attachments',
      refresh: 'true',
    });
  });

  it('indexes a document without a file as it is', async () => {
    const doc = { id: 'note-1', title: 'note', body: 'a lighthouse' };
    client.index.mockResolvedValue({ body: { _id: 'note-1' } });

    await service.index(doc);
    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({ body: doc }),
    );
  });

  it('sends a document without an id with none, and answers with the id OpenSearch gives it', async () => {
    client.index.mockResolvedValue({ body: { _id: 'kX3fQ' } });

    await expect(
      service.index({ title: 'note', body: 'text' }),
    ).resolves.toEqual({ indexed: 'kX3fQ' });
    const [params] = client.index.mock.calls[0] as [{ id?: string }];
    expect(params.id).toBeUndefined();
  });

  it('deletes the documents index', async () => {
    client.indices.delete.mockResolvedValue({ body: { acknowledged: true } });

    await expect(service.deleteIndex()).resolves.toEqual({
      acknowledged: true,
    });
    expect(client.indices.delete).toHaveBeenCalledWith({ index: 'documents' });
  });
});

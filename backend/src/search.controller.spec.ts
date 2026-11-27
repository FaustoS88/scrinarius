import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiResponse, Client, errors } from '@opensearch-project/opensearch';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './app.module';
import { SearchService } from './search.service';

// An OpenSearch error as the client throws it, with the request's Authorization header inside
function openSearchError(statusCode: number, body: unknown) {
  return new errors.ResponseError({
    body,
    statusCode,
    headers: {},
    meta: {
      request: { params: { headers: { authorization: 'ApiKey test-key' } } },
    },
  } as unknown as ApiResponse);
}

// The real module over HTTP, with the service faked: routes, paging, validation and the OpenSearch error filter
describe('SearchController', () => {
  const service = {
    search: jest.fn(),
    index: jest.fn(),
    deleteIndex: jest.fn(),
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Client)
      .useValue({})
      .overrideProvider(SearchService)
      .useValue(service)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  it('passes the words and the paging to the service', async () => {
    service.search.mockResolvedValue([{ _id: 'harbour' }]);

    await request(app.getHttpServer())
      .get('/search?q=harbour&from=10&size=20')
      .expect(200, [{ _id: 'harbour' }]);
    expect(service.search).toHaveBeenCalledWith('harbour', 10, 20);
  });

  it('asks for the first 50 documents when the request gives no words or paging', async () => {
    service.search.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/search').expect(200, []);
    expect(service.search).toHaveBeenCalledWith('', 0, 50);
  });

  it('answers 400 to paging that is not a number', async () => {
    await request(app.getHttpServer()).get('/search?size=ten').expect(400);
    expect(service.search).not.toHaveBeenCalled();
  });

  it('indexes a document and answers with its id', async () => {
    const doc = {
      id: 'note-1',
      title: 'note',
      body: 'a lighthouse',
      tags: ['sea'],
    };
    service.index.mockResolvedValue({ indexed: 'note-1' });

    await request(app.getHttpServer())
      .post('/search/index')
      .send(doc)
      .expect(201, { indexed: 'note-1' });
    expect(service.index).toHaveBeenCalledWith(doc);
  });

  it.each([
    ['a field the API does not know', { title: 'note', author: 'someone' }],
    ['a title that is not text', { title: 42 }],
    ['an empty list of tags', { title: 'note', tags: [] }],
  ])('answers 400 to a document with %s', async (_case, doc) => {
    await request(app.getHttpServer())
      .post('/search/index')
      .send(doc)
      .expect(400);
    expect(service.index).not.toHaveBeenCalled();
  });

  it('deletes the index', async () => {
    service.deleteIndex.mockResolvedValue({ acknowledged: true });

    await request(app.getHttpServer())
      .delete('/search/index')
      .expect(200, { acknowledged: true });
  });

  it('answers 400 with the reason when OpenSearch refuses the input', async () => {
    service.index.mockRejectedValue(
      openSearchError(400, {
        error: {
          type: 'illegal_argument_exception',
          root_cause: [
            { type: 'illegal_argument_exception', reason: 'Illegal base64' },
          ],
        },
      }),
    );

    await request(app.getHttpServer())
      .post('/search/index')
      .send({ title: 'broken.pdf', data: 'not base64' })
      .expect(400, {
        statusCode: 400,
        message:
          'illegal_argument_exception: [illegal_argument_exception] Reason: Illegal base64',
      });
  });

  it('answers 500 to any other OpenSearch failure and logs it without the request headers', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service.search.mockRejectedValue(openSearchError(401, 'Unauthorized'));

    await request(app.getHttpServer())
      .get('/search?q=harbour')
      .expect(500, { statusCode: 500, message: 'Internal server error' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('ResponseError 401: Response Error');
    expect(JSON.stringify(log.mock.calls)).not.toContain('test-key');
    log.mockRestore();
  });
});

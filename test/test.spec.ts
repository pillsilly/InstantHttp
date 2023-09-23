import { run } from '../src/run';

const request = require('supertest');

describe('Test run.js', function () {
  let app = beforeEach(function () {});

  afterEach(function () {
    app.close();
    jest.clearAllMocks();
  });

  afterAll(function () {});

  it('should start server without passing arguments', async function () {
    app = await run({} as any);
    await request(app).get('/').expect('Content-Type', /html/).expect(200);
  });

  describe('Default mode', function () {
    it('should list files when given request path is a real directory', async function () {
      app = await run({} as any);
      const response = await request(app).get('/').expect(200);

      expect(response.text.startsWith('<h2>Current Di')).toBeTruthy();
    });

    it('should forward request /api/abc to proxyTarget http://localhost:9091', async function () {
      const params = {
        proxyPattern: '/api/*',
        proxyTarget: 'http://localhost:9099/'
      };
      app = await run(params as any);

      const res = await request(app).get('/api/abc');

      expect(res.text).toEqual(
        'Error occurred while trying to proxy: 127.0.0.1:9090/api/abc'
      );
    });
  });

  describe('SPA Mode', function () {
    it('should redirect to index.html when given url can not match any resource', async function () {
      app = await run({ mode: 'SPA', indexFile: 'test/resource/test.index.file' } as any);

      const res = await request(app).get('/api/abc').expect(200);

      expect(res.text.trim()).toEqual('test index file.');
    });
  });
});

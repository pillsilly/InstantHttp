const request = require('supertest');
const ChromeLauncher = require('chrome-launcher');
jest.mock('chrome-launcher');
const run = require('../src/run');

describe('Test run.js', function () {
  let app = beforeEach(function () {});

  afterEach(function () {
    app.close();
    jest.clearAllMocks();
  });

  it('should start server without passing arguments', async function () {
    app = run();
    await request(app).get('/').expect('Content-Type', /html/).expect(200);
  });

  describe('Default mode', function () {
    it('should list files when given request path is a real directory', async function () {
      app = run({dir: './'});
      const res = await request(app).get('/').expect(200);
      expect(
        res.text.endsWith("<a href='src'>src</a><br><a href='test'>test</a>")
      ).toBeTruthy();
    });

    it('should forward request /api/abc to proxyTarget http://localhost:9091', async function () {
      app = run({
        proxyPattern: '/api/*',
        proxyTarget: 'http://localhost:9099/',
      });

      const res = await request(app).get('/api/abc');

      expect(res.text).toEqual(
        'Error occured while trying to proxy to: 127.0.0.1:9090/api/abc'
      );
    });

  });

  it('should launch chrome if option "open" is true', function () {
    ChromeLauncher.launch.mockImplementationOnce(() => Promise.resolve());
    const run = require('../src/run');
    app = run({open: true});
    expect(ChromeLauncher.launch).toBeCalledWith({
      chromeFlags: ['--disable-web-security'],
      startingUrl: 'http://127.0.0.1:9090/',
    });
    expect(ChromeLauncher.launch).toBeCalledTimes(1);
  });

  describe('SPA Mode', function () {
    it('should redirect to index.html when given url can not match any resource', async function () {
      app = run({mode: 'SPA', indexFile: 'test/test.index.file'});

      const res = await request(app).get('/api/abc').expect(200);

      expect(res.text.trim()).toEqual('test index file.');
    });
  });
});

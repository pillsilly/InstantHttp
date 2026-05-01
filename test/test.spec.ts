import { run } from '../src/run';

const request = require('supertest');

describe('Test run.js', function () {
  let app: any;

  beforeEach(function () {});

  afterEach(function () {
    if (app) {
      app.close();
    }
    jest.clearAllMocks();
  });

  afterAll(function () {});

  let portCounter = 9100;

  function getNextPort() {
    return String(portCounter++);
  }

  it('should start server without passing arguments', async function () {
    app = run({ port: getNextPort() } as any);
    await request(app).get('/').expect('Content-Type', /html/).expect(200);
  });

  it('should throw error when directory does not exist', function () {
    expect(() => {
      run({ dir: '/non_existent_directory_12345', port: getNextPort() } as any);
    }).toThrow('Dir [/non_existent_directory_12345] does not exit');
  });

  it('should log incoming requests when quiet is false', async function () {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    app = run({ port: getNextPort(), quiet: false } as any);
    await request(app).get('/');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Incoming request:'));
    consoleLogSpy.mockRestore();
  });

  describe('Default mode', function () {
    it('should list files when given request path is a real directory', async function () {
      app = run({ port: getNextPort() } as any);
      const response = await request(app).get('/').expect(200);

      expect(response.text.startsWith('<h2>Current Di')).toBeTruthy();
    });

    it('should return 404 when requested path does not exist', async function () {
      app = run({ port: getNextPort() } as any);
      // Request a file that doesn't exist (not a directory)
      const response = await request(app).get('/non_existent_file_12345.txt').expect(404);
      expect(response.text).toContain('resource not found');
    });

    it('should forward request /api/abc to proxyTarget http://localhost:9091', async function () {
      const params = {
        port: getNextPort(),
        proxyPattern: '/api/*',
        proxyTarget: 'http://localhost:9099/'
      };
      app = run(params as any);

      const res = await request(app).get('/api/abc');

      expect(res.text).toContain('Error occurred while trying to proxy');
    });

    it('should forward request /api/abc to proxyTarget when proxyPattern has no wildcard', async function () {
      const params = {
        port: getNextPort(),
        proxyPattern: '/api',
        proxyTarget: 'http://localhost:9099/'
      };
      app = run(params as any);

      const res = await request(app).get('/api/abc');

      expect(res.text).toContain('Error occurred while trying to proxy');
    });

    it('should not forward non-matching request to proxy', async function () {
      const params = {
        port: getNextPort(),
        proxyPattern: '/api/*',
        proxyTarget: 'http://localhost:9099/'
      };
      app = run(params as any);

      await request(app).get('/').expect(200);
    });
  });

  describe('SPA Mode', function () {
    it('should redirect to index.html when given url can not match any resource', async function () {
      app = run({ mode: 'SPA', indexFile: 'test/resource/test.index.file', port: getNextPort() } as any);

      const res = await request(app).get('/api/abc').expect(200);

      expect(res.text.trim()).toEqual('test index file.');
    });
  });

  describe('Uncaught exception handler', function () {
    let consoleLogSpy: jest.SpyInstance;
    let uncaughtHandler: any = null;

    beforeEach(function () {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      // Capture the handler without causing infinite recursion
      const originalOn = process.on;
      (process as any).on = function (event: string, handler: any) {
        if (event === 'uncaughtException') {
          uncaughtHandler = handler;
        }
        return originalOn.call(process, event, handler);
      };
    });

    afterEach(function () {
      consoleLogSpy.mockRestore();
      if (uncaughtHandler) {
        process.removeListener('uncaughtException', uncaughtHandler);
        uncaughtHandler = null;
      }
      // Restore original process.on
      delete (process as any).on;
    });

    it('should log EACCES error message for permission errors', function () {
      app = run({ port: getNextPort(), quiet: true } as any);
      expect(uncaughtHandler).not.toBeNull();

      uncaughtHandler({ code: 'EACCES' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'EACCES error(lack of permission), use "run as Administrator" when you try to start the program'
      );
    });

    it('should log general error message for other exceptions', function () {
      app = run({ port: getNextPort(), quiet: true } as any);
      expect(uncaughtHandler).not.toBeNull();

      const testError = new Error('Test error');
      uncaughtHandler(testError);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Caught exception: ',
        testError
      );
    });
  });
});

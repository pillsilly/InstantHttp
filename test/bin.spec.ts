import { run } from '../src/run';
import { getOptions } from '../src/bin';
jest.mock('../src/run');

describe.only('Test bin.js', function () {
  beforeEach(function () {
    // @ts-ignore
    run.mockImplementation(() => {});
  });
  afterAll(function () {});

  it('should give default options', async function () {
    const res = getOptions();
    expect(res).toEqual(
      expect.objectContaining({
        dir: expect.stringContaining('InstantHttp'),
        indexFile: expect.stringMatching('index.html'),
        mode: 'NORMAL',
        open: false,
        port: '9090',
        quiet: false
      })
    );
  });
});

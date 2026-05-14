import {getOptions} from '../src/bin'

describe('Test bin.js', function () {
  const originalArgv = process.argv

  beforeEach(function () {
    process.argv = ['node', 'instant_http']
  })

  afterEach(function () {
    process.argv = originalArgv
    jest.restoreAllMocks()
  })

  it('should give default options', async function () {
    const res = getOptions()
    expect(res).toEqual(
      expect.objectContaining({
        dir: expect.stringContaining('InstantHttp'),
        indexFile: expect.stringMatching('index.html'),
        mode: 'NORMAL',
        port: '9090',
        quiet: false
      })
    )
  })

  it('should parse the new proxy flags', async function () {
    process.argv = [
      'node',
      'instant_http',
      '--proxyStaticFileWise',
      '--https',
      '--httpsKey',
      '/tmp/key.pem',
      '--httpsCert',
      '/tmp/cert.pem',
      '--proxyTarget',
      'http://127.0.0.1:1234'
    ]

    const res = getOptions()
    expect(res).toEqual(
      expect.objectContaining({
        proxyStaticFileWise: true,
        https: true,
        httpsKey: '/tmp/key.pem',
        httpsCert: '/tmp/cert.pem',
        proxyTarget: 'http://127.0.0.1:1234'
      })
    )
  })
})

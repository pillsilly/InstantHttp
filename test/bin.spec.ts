import {getOptions} from '../src/bin'

describe('Test bin.js', function () {
  const originalArgv = process.argv

  beforeEach(function () {
    process.argv = ['node', 'instant_http']
  })

  afterEach(function () {
    process.argv = originalArgv
    jest.restoreAllMocks()
    jest.dontMock('../src/run')
    jest.resetModules()
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

  it('should call run with parsed options from main', function () {
    const runMock = jest.fn()
    const main = loadMainWithRunMock(runMock)

    main()

    expect(runMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: expect.stringContaining('InstantHttp'),
        indexFile: 'index.html',
        mode: 'NORMAL',
        port: '9090',
        quiet: false
      })
    )
  })

  it('should exit with an error message when main fails', function () {
    const runMock = jest.fn(() => {
      throw new Error('boom')
    })
    const main = loadMainWithRunMock(runMock)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => undefined) as never)

    main()

    expect(consoleErrorSpy).toHaveBeenCalledWith('boom')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('should stringify non-Error failures from main', function () {
    const runMock = jest.fn(() => {
      throw 'boom'
    })
    const main = loadMainWithRunMock(runMock)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => undefined) as never)

    main()

    expect(consoleErrorSpy).toHaveBeenCalledWith('boom')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

function loadMainWithRunMock(runMock: jest.Mock) {
  let main: typeof import('../src/bin').main

  jest.isolateModules(() => {
    jest.doMock('../src/run', () => {
      const actual = jest.requireActual<typeof import('../src/run')>('../src/run')
      return {
        ...actual,
        run: runMock
      }
    })

    ;({main} = require('../src/bin'))
  })

  return main!
}

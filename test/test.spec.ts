import fs from 'fs'
import http from 'http'
import https from 'https'
import os from 'os'
import path from 'path'
import {once} from 'events'
import {AddressInfo} from 'net'

import {WebSocketServer} from 'ws'

import {run} from '../src/run'

const request = require('supertest')
const WebSocket = require('ws')

jest.setTimeout(20000)

const activeServers: Array<http.Server | https.Server> = []

afterEach(async function () {
  await Promise.all(activeServers.splice(0).map(closeServer))
  jest.restoreAllMocks()
})

describe('run', function () {
  it('should start server without passing arguments', async function () {
    const dir = makeTempDir()
    const server = run({port: '0', dir} as any)
    activeServers.push(server)

    const response = await request(server).get('/').expect(200)

    expect(response.text).toContain('<h2>Current Dir:')
  })

  it('should throw error when directory does not exist', function () {
    expect(() => {
      run({dir: '/non_existent_directory_12345', port: '0'} as any)
    }).toThrow('Dir [/non_existent_directory_12345] does not exit')
  })

  it('should log incoming requests when quiet is false', async function () {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    const dir = makeTempDir()
    const server = run({port: '0', dir, quiet: false} as any)
    activeServers.push(server)

    await request(server).get('/')

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Incoming request:'))
  })

  it.each(['abc', '-1'])('should reject invalid port %s', function (port) {
    expect(() => {
      run({port, dir: makeTempDir()} as any)
    }).toThrow(`Invalid port: ${port}`)
  })

  it('should use the default port when port is omitted', function () {
    expect(() => {
      run({port: undefined, dir: '/non_existent_directory_12345'} as any)
    }).toThrow('Dir [/non_existent_directory_12345] does not exit')
  })

  it('should log uncaught exceptions', function () {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    const dir = makeTempDir()
    const server = run({port: '0', dir} as any)
    activeServers.push(server)

    const handler = process
      .listeners('uncaughtException')
      .find(listener => String(listener).includes('EACCES error(lack of permission)'))

    expect(handler).toBeDefined()

    ;(handler as (err: Error & {code?: string}) => void)(Object.assign(new Error('denied'), {code: 'EACCES'}))
    ;(handler as (err: Error & {code?: string}) => void)(Object.assign(new Error('boom'), {code: 'OTHER'}))

    expect(consoleLogSpy).toHaveBeenCalledWith(
      'EACCES error(lack of permission), use "run as Administrator" when you try to start the program'
    )
    expect(consoleLogSpy).toHaveBeenCalledWith('Caught exception: ', expect.any(Error))
  })

  describe('legacy proxy mode', function () {
    it('should forward request /api/abc to proxyTarget http://localhost:9091', async function () {
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 200
        res.setHeader('content-type', 'text/plain')
        res.end(`upstream:${req.url}`)
      })

      const server = run({
        port: '0',
        proxyPattern: '/api',
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const response = await request(server).get('/api/abc').expect(200)

      expect(response.text).toBe('upstream:/api/abc')
    })

    it('should not forward non-matching request to proxy', async function () {
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 200
        res.end(`upstream:${req.url}`)
      })

      const dir = makeTempDir()
      const server = run({
        port: '0',
        dir,
        proxyPattern: '/api/*',
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const response = await request(server).get('/').expect(200)

      expect(response.text).toContain('<h2>Current Dir:')
    })

    it('should return 404 for missing paths', async function () {
      const dir = makeTempDir()
      const server = run({
        port: '0',
        dir
      } as any)
      activeServers.push(server)

      const response = await request(server).get('/missing-route').expect(404)

      expect(response.text).toContain(`resource not found: ${path.resolve(`${dir}/missing-route`)}`)
    })
  })

  describe('proxyStaticFileWise mode', function () {
    it('should reject missing static directories', function () {
      expect(() => {
        run({
          port: '0',
          dir: '/non_existent_directory_12345',
          proxyStaticFileWise: true,
          proxyTarget: 'http://127.0.0.1:1'
        } as any)
      }).toThrow('Dir [/non_existent_directory_12345] does not exit')
    })

    it('should serve static files locally before proxying', async function () {
      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'asset.txt': 'local asset'
      })
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 200
        res.setHeader('content-type', 'text/plain')
        res.end(`upstream:${req.url}`)
      })

      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const root = await request(server).get('/').expect(200)
      const login = await request(server).get('/login.html').expect(200)
      const asset = await request(server).get('/asset.txt').expect(200)

      expect(root.text).toContain('local login')
      expect(login.text).toContain('local login')
      expect(asset.text).toBe('local asset')
    })

    it('should reject conflicting proxy flags', function () {
      expect(() => {
        run({
          port: '0',
          dir: makeTempDir(),
          proxyStaticFileWise: true,
          proxyPattern: '/api',
          proxyTarget: 'http://127.0.0.1:1'
        } as any)
      }).toThrow('Invalid argument: --proxyStaticFileWise cannot be used with --proxyPattern')
    })

    it('should reject proxyStaticFileWise without proxyTarget', function () {
      expect(() => {
        run({
          port: '0',
          dir: makeTempDir(),
          proxyStaticFileWise: true
        } as any)
      }).toThrow('Invalid argument: --proxyStaticFileWise requires --proxyTarget')
    })

    it('should normalize upstream headers and preserve POST bodies', async function () {
      const upstreamCalls: Array<{
        url: string
        method: string
        headers: http.IncomingHttpHeaders
        body: string
      }> = []

      const upstream = await startHttpUpstream((req, res) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', chunk => {
          body += chunk
        })
        req.on('end', () => {
          upstreamCalls.push({
            url: req.url ?? '',
            method: req.method ?? '',
            headers: req.headers,
            body
          })
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ok: true}))
        })
      })

      const staticDir = makeStaticFixture({'login.html': '<html><body>local login</body></html>'})
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      await request(server)
        .post('/LoginRequest')
        .set('Origin', `http://127.0.0.1:${proxyPort}`)
        .set('Referer', `http://127.0.0.1:${proxyPort}/login.html`)
        .set('Via', '1.1 proxy')
        .set('X-Forwarded-For', '10.0.0.1')
        .set('X-Forwarded-Host', '127.0.0.1')
        .set('X-Forwarded-Proto', 'http')
        .set('Content-Type', 'application/json')
        .send('{"login":"Nemuadmin","token":"nemuuser"}')
        .expect(200)

      expect(upstreamCalls).toHaveLength(1)
      expect(upstreamCalls[0].url).toBe('/LoginRequest')
      expect(upstreamCalls[0].method).toBe('POST')
      expect(upstreamCalls[0].headers.host).toBe(upstream.hostHeader)
      expect(upstreamCalls[0].headers.origin).toBe(upstream.origin)
      expect(upstreamCalls[0].headers.referer).toBe(`${upstream.origin}/login.html`)
      expect(upstreamCalls[0].headers['x-forwarded-for']).toBeUndefined()
      expect(upstreamCalls[0].headers.via).toBeUndefined()
      expect(upstreamCalls[0].body).toBe('{"login":"Nemuadmin","token":"nemuuser"}')

      await request(server)
        .get('/InvalidRefererRequest')
        .set('Referer', 'not a url')
        .expect(200)

      expect(upstreamCalls).toHaveLength(2)
      expect(upstreamCalls[1].headers.referer).toBe('not a url')
    })

    it('should only log proxy traffic when quiet is false', async function () {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const staticDir = makeStaticFixture({'login.html': '<html><body>local login</body></html>'})
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 200
        res.end(`upstream:${req.url}`)
      })

      const quietServer = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url,
        quiet: true
      } as any)
      activeServers.push(quietServer)

      await request(quietServer).get('/VersionRequest').expect(200)

      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('[proxy-forward]'))

      consoleLogSpy.mockClear()

      const verboseServer = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url,
        quiet: false
      } as any)
      activeServers.push(verboseServer)

      await request(verboseServer).get('/VersionRequest').expect(200)

      expect(consoleLogSpy).toHaveBeenCalledWith('[proxy-forward] GET /VersionRequest')
    })

    it('should forward non-GET local file requests upstream and serve the local file', async function () {
      const upstreamCalls: Array<{
        url: string
        method: string
        headers: http.IncomingHttpHeaders
        body: string
      }> = []

      const upstream = await startHttpUpstream((req, res) => {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', chunk => {
          body += chunk
        })
        req.on('end', () => {
          upstreamCalls.push({
            url: req.url ?? '',
            method: req.method ?? '',
            headers: req.headers,
            body
          })
          res.statusCode = 200
          res.setHeader('set-cookie', 'sid=abc; Domain=localhost; Path=/')
          res.end('<html><body>upstream admin</body></html>')
        })
      })

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'ADMIN.html': '<html><body>local admin</body></html>',
        'folder/file.txt': 'nested file'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      const response = await request(server)
        .post('/ADMIN.html?authorization=token-123')
        .set('Origin', `http://127.0.0.1:${proxyPort}`)
        .set('Referer', `http://127.0.0.1:${proxyPort}/`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('httpSessionId=123')
        .expect(200)

      expect(response.text).toContain('local admin')
      expect(response.text).not.toContain('upstream admin')
      expect(response.headers['set-cookie']).toEqual(['sid=abc; Path=/'])
      expect(response.headers['content-type']).toContain('text/html')
      expect(response.headers['content-length']).toBe(String('<html><body>local admin</body></html>'.length))
      expect(upstreamCalls).toHaveLength(1)
      expect(upstreamCalls[0].url).toBe('/ADMIN.html?authorization=token-123')
      expect(upstreamCalls[0].method).toBe('POST')
      expect(upstreamCalls[0].headers.host).toBe(upstream.hostHeader)
      expect(upstreamCalls[0].headers.origin).toBe(upstream.origin)
      expect(upstreamCalls[0].headers.referer).toBe(`${upstream.origin}/`)
      expect(upstreamCalls[0].body).toBe('httpSessionId=123')
    })

    it.each([
      ['script.js', 'text/javascript', 'console.log("local")'],
      ['style.css', 'text/css', 'body { color: red; }'],
      ['data.json', 'application/json', '{"local":true}'],
      ['asset.bin', 'application/octet-stream', 'local-binary']
    ])('should serve local %s content after upstream side effect', async function (fileName, contentType, content) {
      const upstreamCalls: string[] = []
      const upstream = await startHttpUpstream((req, res) => {
        upstreamCalls.push(req.url ?? '')
        res.statusCode = 204
        res.end()
      })

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        [fileName]: content
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const response = await request(server).post(`/${fileName}?sideEffect=1`).expect(200)

      const body = response.text ?? (Buffer.isBuffer(response.body) ? response.body.toString() : JSON.stringify(response.body))
      expect(body).toBe(content)
      expect(response.headers['content-type']).toContain(contentType)
      expect(upstreamCalls).toEqual([`/${fileName}?sideEffect=1`])
    })

    it('should proxy non-GET requests that do not resolve to local files', async function () {
      const upstreamCalls: string[] = []
      const upstream = await startHttpUpstream((req, res) => {
        upstreamCalls.push(req.url ?? '')
        res.statusCode = 200
        res.end(`upstream:${req.url}`)
      })

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'ADMIN.html': '<html><body>local admin</body></html>'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      await request(server).post('/missing.html').expect(200, 'upstream:/missing.html')
      await request(server).post('/%2e%2e%2fADMIN.html').expect(200)
      await request(server).post('/folder').expect(200, 'upstream:/folder')
      await request(server).post('/%E0%A4%A').expect(200)

      expect(upstreamCalls).toEqual(['/missing.html', '/%2e%2e%2fADMIN.html', '/folder', '/%E0%A4%A'])
    })

    it('should return upstream errors for non-GET local file side effects', async function () {
      const upstream = await startHttpUpstream((_req, res) => {
        res.statusCode = 401
        res.setHeader('x-upstream-error', 'denied')
        res.setHeader('transfer-encoding', 'chunked')
        res.setHeader('set-cookie', 'sid=denied; Domain=localhost; Path=/')
        res.end('denied by upstream')
      })

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'ADMIN.html': '<html><body>local admin</body></html>'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const response = await request(server).post('/ADMIN.html?authorization=bad-token').expect(401)

      expect(response.text).toBe('denied by upstream')
      expect(response.headers['x-upstream-error']).toBe('denied')
      expect(response.headers['set-cookie']).toEqual(['sid=denied; Path=/'])
    })

    it('should return 502 when local file side effect forwarding fails', async function () {
      const deadServer = http.createServer()
      await listen(deadServer)
      const deadPort = getAddressPort(deadServer)
      await closeServer(deadServer)

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'ADMIN.html': '<html><body>local admin</body></html>'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: `http://127.0.0.1:${deadPort}`
      } as any)
      activeServers.push(server)

      const response = await request(server).post('/ADMIN.html?authorization=token-123').expect(502)

      expect(response.text).toContain('proxy side effect failed:')
    })

    it('should forward local file side effects to HTTPS upstreams', async function () {
      const upstreamCalls: string[] = []
      const upstream = await startHttpsUpstream((req, res) => {
        upstreamCalls.push(req.url ?? '')
        res.statusCode = 204
        res.end()
      })

      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>',
        'ADMIN.html': '<html><body>local admin</body></html>'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)

      const response = await request(server).post('/ADMIN.html?authorization=token-123').expect(200)

      expect(response.text).toContain('local admin')
      expect(upstreamCalls).toEqual(['/ADMIN.html?authorization=token-123'])
    })

    it('should rewrite upstream redirects to the proxy origin', async function () {
      let upstreamUrl = ''
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 302
        res.setHeader('location', `${upstreamUrl}/redirected`)
        res.end('')
      })
      upstreamUrl = upstream.url

      const staticDir = makeStaticFixture({'login.html': '<html><body>local login</body></html>'})
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      const response = await request(server).get('/VersionRequest').expect(302)

      expect(response.headers.location).toBe(`http://127.0.0.1:${proxyPort}/redirected`)
    })

    it('should forward websocket upgrades', async function () {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const wsState = {
        messages: [] as string[],
        upgradeUrl: ''
      }

      const upstream = await startWebSocketUpstream(wsState)
      const staticDir = makeStaticFixture({'login.html': '<html><body>local login</body></html>'})
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url,
        quiet: false
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:${proxyPort}/websocket`)
        socket.on('open', () => {
          socket.send('ping')
        })
        socket.on('message', message => {
          expect(String(message)).toBe('echo:ping')
          socket.close()
          resolve()
        })
        socket.on('error', reject)
      })

      expect(wsState.upgradeUrl).toBe('/websocket')
      expect(wsState.messages).toContain('ping')
      expect(consoleLogSpy).toHaveBeenCalledWith('[ws-upgrade] GET /websocket')
      expect(consoleLogSpy).toHaveBeenCalledWith('[ws-proxy-forward] GET /websocket')
    })

    it('should suppress websocket proxy logs when quiet is true', async function () {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const wsState = {
        messages: [] as string[],
        upgradeUrl: ''
      }

      const upstream = await startWebSocketUpstream(wsState)
      const staticDir = makeStaticFixture({'login.html': '<html><body>local login</body></html>'})
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url,
        quiet: true
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(`ws://127.0.0.1:${proxyPort}/websocket`)
        socket.on('open', () => {
          socket.send('ping')
        })
        socket.on('message', () => {
          socket.close()
          resolve()
        })
        socket.on('error', reject)
      })

      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('[ws-proxy-forward]'))
    })

    it('should fail when HTTPS certificate files are unavailable', function () {
      const dir = makeTempDir()
      jest.spyOn(fs, 'existsSync').mockImplementation(candidate => candidate === dir)

      expect(() => {
        run({
          port: '0',
          dir,
          proxyStaticFileWise: true,
          proxyTarget: 'http://127.0.0.1:1234',
          https: true
        } as any)
      }).toThrow('Unable to find server.key')
    })
  })

  describe('HTTPS listener', function () {
    it('should serve the legacy server over HTTPS when enabled', async function () {
      const staticDir = makeStaticFixture({
        'index.html': '<html><body>legacy https</body></html>'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        https: true,
        httpsKey: path.resolve(__dirname, '..', 'server.key'),
        httpsCert: path.resolve(__dirname, '..', 'server.cert')
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      const body = await httpsGet(proxyPort, '/')

      expect(body).toContain('legacy https')
    })

    it('should serve the proxy over HTTPS when enabled', async function () {
      const staticDir = makeStaticFixture({
        'login.html': '<html><body>local login</body></html>'
      })
      const upstream = await startHttpUpstream((req, res) => {
        res.statusCode = 200
        res.end('upstream')
      })
      const server = run({
        port: '0',
        dir: staticDir,
        indexFile: 'login.html',
        proxyStaticFileWise: true,
        proxyTarget: upstream.url,
        https: true,
        httpsKey: path.resolve(__dirname, '..', 'server.key'),
        httpsCert: path.resolve(__dirname, '..', 'server.cert')
      } as any)
      activeServers.push(server)
      const proxyPort = await getServerPort(server)

      const body = await httpsGet(proxyPort, '/')

      expect(body).toContain('local login')
    })
  })

  describe('SPA mode', function () {
    it('should fall back to index.html for missing routes', async function () {
      const staticDir = makeStaticFixture({
        'index.html': '<html><body>spa index</body></html>',
        'assets/app.js': 'console.log("spa")'
      })
      const server = run({
        port: '0',
        dir: staticDir,
        mode: 'SPA',
        indexFile: 'index.html'
      } as any)
      activeServers.push(server)

      const response = await request(server).get('/missing-route').expect(200)

      expect(response.text).toContain('spa index')
    })
  })
})

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'instant-http-'))
}

function makeStaticFixture(files: Record<string, string>): string {
  const dir = makeTempDir()
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath)
    fs.mkdirSync(path.dirname(fullPath), {recursive: true})
    fs.writeFileSync(fullPath, content)
  }
  return dir
}

async function closeServer(server: http.Server | https.Server) {
  if (!server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function getServerPort(server: http.Server | https.Server): Promise<number> {
  if (!server.listening) {
    await once(server, 'listening')
  }

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('server did not start listening')
  }

  return address.port
}

async function startHttpUpstream(
  handler: http.RequestListener
): Promise<{server: http.Server, url: string, origin: string, hostHeader: string}> {
  const server = http.createServer(handler)
  await listen(server)
  activeServers.push(server)
  const port = getAddressPort(server)

  return {
    server,
    url: `http://127.0.0.1:${port}`,
    origin: `http://127.0.0.1:${port}`,
    hostHeader: `127.0.0.1:${port}`
  }
}

async function startHttpsUpstream(
  handler: http.RequestListener
): Promise<{server: https.Server, url: string, origin: string, hostHeader: string}> {
  const server = https.createServer(
    {
      key: fs.readFileSync(path.resolve(__dirname, '..', 'server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '..', 'server.cert'))
    },
    handler
  )
  await listen(server)
  activeServers.push(server)
  const port = getAddressPort(server)

  return {
    server,
    url: `https://127.0.0.1:${port}`,
    origin: `https://127.0.0.1:${port}`,
    hostHeader: `127.0.0.1:${port}`
  }
}

async function startWebSocketUpstream(state: {messages: string[], upgradeUrl: string}) {
  const server = http.createServer()
  const wss = new WebSocketServer({noServer: true})

  server.on('upgrade', (req, socket, head) => {
    state.upgradeUrl = req.url ?? ''
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', ws => {
    ws.on('message', message => {
      const text = String(message)
      state.messages.push(text)
      ws.send(`echo:${text}`)
    })
  })

  await listen(server)
  activeServers.push(server)
  const port = getAddressPort(server)

  return {
    server,
    url: `http://127.0.0.1:${port}`
  }
}

async function listen(server: http.Server | https.Server): Promise<void> {
  if (server.listening) return

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}

function getAddressPort(server: http.Server | https.Server): number {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('server did not start listening')
  }

  return (address as AddressInfo).port
}

async function httpsGet(port: number, pathname: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method: 'GET',
        rejectUnauthorized: false
      },
      res => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => {
          body += chunk
        })
        res.on('end', () => resolve(body))
      }
    )

    req.on('error', reject)
    req.end()
  })
}

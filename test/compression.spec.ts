import {once} from 'events'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import {AddressInfo} from 'net'

import {run} from '../src/run'

jest.setTimeout(10000)

const activeServers: Array<http.Server> = []

afterEach(function () {
  for (const server of activeServers.splice(0)) {
    server.close()
  }
})

describe('compression middleware', function () {
  it('should gzip-compress responses when client accepts gzip', async function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'instant-http-'))
    fs.writeFileSync(path.join(dir, 'big.txt'), 'x'.repeat(5000))

    const server = run({port: '0', dir} as any)
    activeServers.push(server)
    await once(server, 'listening')
    const port = (server.address() as AddressInfo).port

    const {headers, body} = await rawGet(port, '/big.txt', 'gzip')

    expect(headers['content-encoding']).toBe('gzip')

    const decompressed = zlib.gunzipSync(body)
    expect(decompressed.toString()).toBe('x'.repeat(5000))
  })

  it('should brotli-compress responses when client accepts br', async function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'instant-http-'))
    fs.writeFileSync(path.join(dir, 'big.txt'), 'x'.repeat(5000))

    const server = run({port: '0', dir} as any)
    activeServers.push(server)
    await once(server, 'listening')
    const port = (server.address() as AddressInfo).port

    const {headers, body} = await rawGet(port, '/big.txt', 'br')

    expect(headers['content-encoding']).toBe('br')

    const decompressed = zlib.brotliDecompressSync(body)
    expect(decompressed.toString()).toBe('x'.repeat(5000))
  })

  it('should skip compression for responses below threshold', async function () {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'instant-http-'))
    fs.writeFileSync(path.join(dir, 'small.txt'), 'x'.repeat(100))

    const server = run({port: '0', dir} as any)
    activeServers.push(server)
    await once(server, 'listening')
    const port = (server.address() as AddressInfo).port

    const {headers, body} = await rawGet(port, '/small.txt', 'gzip')

    expect(headers['content-encoding']).toBeUndefined()
    expect(body.toString()).toBe('x'.repeat(100))
  })
})

async function rawGet(
  port: number,
  pathname: string,
  acceptEncoding: string | null
): Promise<{headers: http.IncomingHttpHeaders; body: Buffer}> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      host: '127.0.0.1',
      port,
      path: pathname,
      method: 'GET',
      headers: acceptEncoding ? {'Accept-Encoding': acceptEncoding} : undefined,
    }
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve({headers: res.headers, body: Buffer.concat(chunks)}))
    })
    req.on('error', reject)
    req.end()
  })
}

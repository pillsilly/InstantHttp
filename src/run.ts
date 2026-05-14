import path from 'path'
import http from 'http'
import https from 'https'
import express, {Request} from 'express'
import cors from 'cors'
import fs from 'fs'
import compression from 'compression'

import {createProxyMiddleware} from 'http-proxy-middleware'

import {version} from '../package.json'

export const MODE = {
  NORMAL: 'NORMAL',
  SPA: 'SPA',
  PROXY_STATIC_FILE_WISE: 'PROXY_STATIC_FILE_WISE'
} as const

type Mode = typeof MODE[keyof typeof MODE]

interface CliArg {
  port?: string
  dir?: string
  mode?: Mode | string
  indexFile?: string
  quiet?: boolean
  proxyTarget?: string
  proxyPattern?: string
  proxyStaticFileWise?: boolean
  https?: boolean
  httpsKey?: string
  httpsCert?: string
}

const defaultArguments = {
  port: '9090',
  dir: process.cwd(),
  mode: MODE.NORMAL,
  indexFile: 'index.html',
  quiet: true,
  proxyTarget: '',
  proxyPattern: '',
  proxyStaticFileWise: false,
  https: false,
  httpsKey: '',
  httpsCert: ''
}

const PROXY_FINGERPRINT_HEADERS = ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'via'] as const
let uncaughtExceptionRegistered = false

export function run(parameters: CliArg) {
  const resolved = Object.assign({ ...defaultArguments }, parameters)
  const port = parsePort(resolved.port)

  validateArguments(resolved)

  console.log(`Version: ${version}`)

  const app = express()
  const proxyMode = resolved.proxyStaticFileWise ? MODE.PROXY_STATIC_FILE_WISE : resolved.mode

  let server: http.Server | https.Server

  if (proxyMode === MODE.PROXY_STATIC_FILE_WISE) {
    server = createProxyStaticFirstServer(app, resolved, port)
  } else {
    server = createLegacyServer(app, resolved, port)
  }

  if (!uncaughtExceptionRegistered) {
    process.on('uncaughtException', function (err: any) {
      if (err.code === 'EACCES') {
        console.log(
          'EACCES error(lack of permission), use "run as Administrator" when you try to start the program'
        )
      } else {
        console.log('Caught exception: ', err)
      }
    })
    uncaughtExceptionRegistered = true
  }

  return server
}

function parsePort(port: string | number | undefined): number {
  const parsed = Number(port ?? defaultArguments.port)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid port: ${String(port)}`)
  }

  return parsed
}

function validateArguments(parameters: typeof defaultArguments) {
  if (parameters.proxyStaticFileWise && !parameters.proxyTarget) {
    throw new Error('Invalid argument: --proxyStaticFileWise requires --proxyTarget')
  }

  if (parameters.proxyStaticFileWise && parameters.proxyPattern) {
    throw new Error('Invalid argument: --proxyStaticFileWise cannot be used with --proxyPattern')
  }
}

function createLegacyServer(app: express.Express, parameters: typeof defaultArguments, port: number) {
  const dir = path.resolve(parameters.dir)

  app.use(cors())
  app.use(compression())

  if (parameters.proxyTarget && parameters.proxyPattern) {
    const proxy = createProxyMiddleware({
      target: parameters.proxyTarget,
      changeOrigin: true,
      secure: false
    })

    let patternRegex: RegExp
    if (parameters.proxyPattern.includes('*')) {
      const regexPattern = '^' + parameters.proxyPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      patternRegex = new RegExp(regexPattern)
    } else {
      patternRegex = new RegExp('^' + parameters.proxyPattern.replace(/\./g, '\\.') + '.*$')
    }

    app.use((req, res, next) => {
      if (patternRegex.test(req.url)) {
        proxy(req, res, next)
      } else {
        next()
      }
    })
  }

  const router = express.Router()
  router.use(function (req, _res, next) {
    if (!parameters.quiet) console.log(`Incoming request: ${req.originalUrl}`)

    next()
  })

  console.log(`Serving dir [${parameters.dir}]`)
  console.log('')
  console.log('  Server running at:')
  console.log(`  \x1b[1;34m${parameters.https ? 'https' : 'http'}://127.0.0.1:${port}/\x1b[0m`)
  console.log('')

  if (!fs.existsSync(dir)) {
    throw Error(`Dir [${parameters.dir}] does not exit`)
  }

  if (parameters.mode === MODE.SPA) {
    app.use(router)
    app.use(express.static(dir))
    app.use(handleSPA({dir, indexFile: parameters.indexFile}))
  } else {
    app.use(router)
    app.use(express.static(dir))
    app.use(function (req: any, res: any) {
      const requestPath = path.resolve(`${dir}${req.url}`)

      fs.readdir(
        requestPath,
        {withFileTypes: true},
        (_a: any, list: Array<{name: any}>) => {
          if (!list) {
            res.status(404).send(`resource not found: ${requestPath}`)
            return
          }
          const title = `<h2>Current Dir: ${requestPath}</h2>`
          const html =
            title +
            list
              .map((f: {name: any}) => f.name)
              .map((name: any) => `<a href='${name}'>${name}</a>`)
              .join('<br>')

          res.setHeader('Content-Type', 'text/html; charset=UTF-8')
          res.status(200).send(html)
        }
      )
    })
  }

  return createHttpOrHttpsServer(app, parameters, port)
}

function createProxyStaticFirstServer(app: express.Express, parameters: typeof defaultArguments, port: number) {
  const dir = path.resolve(parameters.dir)
  const proxyTarget = new URL(parameters.proxyTarget)

  if (!fs.existsSync(dir)) {
    throw Error(`Dir [${parameters.dir}] does not exit`)
  }

  const proxy = createProxyMiddleware({
    target: parameters.proxyTarget,
    changeOrigin: true,
    secure: false,
    ws: true,
    xfwd: false,
    autoRewrite: true,
    protocolRewrite: parameters.https ? 'https' : 'http',
    logLevel: 'warn',
    on: {
      proxyReq(proxyReq, req) {
        normalizeProxyRequest(proxyReq, req, proxyTarget.origin, proxyTarget.host, false)
      },
      proxyReqWs(proxyReq, req) {
        normalizeProxyRequest(proxyReq, req, proxyTarget.origin, proxyTarget.host, true)
      }
    }
  })

  app.use(
    express.static(dir, {
      index: parameters.indexFile,
      fallthrough: true
    })
  )

  app.use((req, res, next) => proxy(req, res, next))

  const server = createHttpOrHttpsServer(app, parameters, port)
  server.on('upgrade', (req, socket, head) => proxy.upgrade(req, socket, head))

  console.log(`Serving dir [${parameters.dir}]`)
  console.log('')
  console.log('  Server running at:')
  console.log(`  \x1b[1;34m${parameters.https ? 'https' : 'http'}://127.0.0.1:${port}/\x1b[0m`)
  console.log('')

  return server
}

function normalizeProxyRequest(proxyReq: any, req: any, targetOrigin: string, targetHost: string, forceOrigin: boolean) {
  proxyReq.setHeader('host', targetHost)

  if (forceOrigin || req.method !== 'GET' && req.method !== 'HEAD') {
    proxyReq.setHeader('origin', targetOrigin)
  }

  proxyReq.setHeader('referer', rewriteReferer(req.headers.referer, targetOrigin) || `${targetOrigin}/`)

  for (const header of PROXY_FINGERPRINT_HEADERS) {
    proxyReq.removeHeader(header)
  }
}

function rewriteReferer(value: string | undefined, targetOrigin: string): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    const target = new URL(targetOrigin)
    url.protocol = target.protocol
    url.host = target.host
    return url.toString()
  } catch {
    return value
  }
}

function createHttpOrHttpsServer(app: express.Express, parameters: typeof defaultArguments, port: number) {
  if (!parameters.https) {
    const server = http.createServer(app)
    server.listen(port)
    return server
  }

  const keyPath = resolveHttpsPath(parameters.httpsKey, 'server.key')
  const certPath = resolveHttpsPath(parameters.httpsCert, 'server.cert')

  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    },
    app
  )

  server.listen(port)
  return server
}

function resolveHttpsPath(explicitPath: string, fileName: string): string {
  const candidates = [
    explicitPath,
    path.resolve(process.cwd(), fileName),
    path.resolve(__dirname, '..', fileName)
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(`Unable to find ${fileName}. Checked: ${candidates.join(', ')}`)
}

function handleSPA({dir, indexFile}: {dir: string, indexFile: string}) {
  return (req: Request, res: any) => {
    const requestPath = path.resolve(`${dir}${req.url}`)

    fs.readdir(requestPath, {withFileTypes: true}, () => {
      res.writeHead(200, {'Content-Type': 'text/html'})
      res.write(fs.readFileSync(`${dir}/${indexFile}`))
      res.end()
    })
  }
}

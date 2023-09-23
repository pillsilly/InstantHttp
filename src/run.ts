import path from 'path'
import express, {Request} from 'express';
import cors from 'cors'
import fs from 'fs'

import compression from 'compression'

import { version } from '../package.json'

export const MODE = {
  NORMAL: 'NORMAL',
  SPA: 'SPA'
}

interface CliArg {
  port: string
  dir: string
  open: boolean
  mode: string
  indexFile: string
  quiet: boolean
  proxyTarget: string
  proxyPattern: string
}

const defaultArguments: CliArg = {
  port: '9090',
  dir: process.cwd(),
  open: false,
  mode: MODE.NORMAL,
  indexFile: 'index.html',
  quiet: true,
  proxyTarget: '',
  proxyPattern: ''
};
export async function run (parameters: CliArg) {
  parameters = Object.assign({ ...defaultArguments }, parameters)
  const { port, dir, proxyTarget, proxyPattern, open, mode, indexFile, quiet } =
    parameters
  console.log(`Version: ${version}`)
  const app = express()
  if (proxyTarget && proxyPattern) {
    const { createProxyMiddleware } = require('http-proxy-middleware')
    app.use(
      proxyPattern,
      createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      })
    )
  }
  const router = express.Router()
  router.get('/*', function (req, _res, next) {
    if (!quiet) console.log(`Incoming request: ${req.originalUrl}`)

    next()
  })

  console.log(`Serving dir [${dir}]`)
  console.log(`Serving port ${port}`)

  if (!fs.existsSync(path.resolve(dir))) {
    throw Error(`Dir [${dir}] does not exit`)
  }

  if (mode === MODE.SPA) {
    app.use([
      cors(),
      compression(),
      router,
      express.static(dir),
      handleSPA({ dir, indexFile })
    ])
  } else {
    app.use([
      cors(),
      compression(),
      router,
      express.static(dir),
      function (req: any, res: any) {
        const requestPath = path.resolve(`${dir}${req.url}`)

        fs.readdir(
          requestPath,
          { withFileTypes: true },
          (_a: any, list: Array<{ name: any }>) => {
            if (!list) {
              res.status(404).send(`resource not found: ${requestPath}`)
              return
            }
            const title = `<h2>Current Dir: ${requestPath}</h2>`
            const html =
              title +
              list
                .map((f: { name: any }) => f.name)
                .map((name: any) => `<a href='${name}'>${name}</a>`)
                .join('<br>')

            res.setHeader('Content-Type', 'text/html; charset=UTF-8')
            res.status(200).send(html)
          }
        )
      }
    ])
  }

  const server = app.listen(port)

  process.on('uncaughtException', function (err: any) {
    if (err.code === 'EACCES') {
      console.log(
        'EACCES error(lack of permission), use "run as Administrator" when you try to start the program'
      )
    } else {
      console.log('Caught exception: ', err)
    }
  })

  if (open) {
    const ChromeLauncher = await import('chrome-launcher')
    void ChromeLauncher.launch({
      startingUrl: `http://127.0.0.1:${port}/`,
      chromeFlags: ['--disable-web-security']
    })
      .catch((e) => {
        console.log(
          "failed to launch chrome, pls start chrome with the flag '--disable-web-security' manually.",
          e
        )
      })
      .then(() => {
        process.on('exit', (code) => {
          console.log(`Exit nd kill launched chrome code-${code}`)
          ChromeLauncher.killAll()
        })
      })
  }

  return server
}

function handleSPA ({ dir, indexFile }: { dir: string, indexFile: string }) {
  return (req: Request, res: any) => {
    const requestPath = path.resolve(`${dir}${req.url}`)

    fs.readdir(requestPath, { withFileTypes: true }, () => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write(fs.readFileSync(`${dir}/${indexFile}`))
      res.end()
    })
  }
}

// export {run, MODE};

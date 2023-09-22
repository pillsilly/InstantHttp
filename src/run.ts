import path from 'path';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import * as ChromeLauncher from 'chrome-launcher';

const compression = require('compression');
const {version} = require('../package.json');
const MODE = {
  NORMAL: 'NORMAL',
  SPA: 'SPA',
};

const defaultArguments = {
  port: '9090',
  dir: process.cwd(),
  open: false,
  mode: MODE.NORMAL,
  indexFile: 'index.html',
  quiet: true,
  proxyTarget: '',
  proxyPattern: '',
};

function run(args: Partial<typeof defaultArguments> = {}) {
  args = Object.assign({...defaultArguments}, args);
  const {port, dir, proxyTarget, proxyPattern, open, mode, indexFile, quiet} =
    args;
  console.log(`Version: ${version}`);
  const app = express();
  if (proxyTarget && proxyPattern) {
    const {createProxyMiddleware} = require('http-proxy-middleware');
    app.use(
      proxyPattern,
      createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      })
    );
  }
  const router = express.Router();
  router.get('/*', function (req, res, next) {
    if (!quiet) console.log(`Incoming request: ${req.originalUrl}`);

    next();
  });

  console.log(`Serving dir [${dir}]`);
  console.log(`Serving port ${port}`);

  if (!fs.existsSync(path.resolve(dir))) {
    throw Error(`Dir [${dir}] does not exit`);
  }

  if (mode === MODE.SPA) {
    app.use([
      cors(),
      compression(),
      router,
      express.static(dir),
      handleSPA({dir, indexFile}),
    ]);
  } else {
    app.use([
      cors(),
      compression(),
      router,
      express.static(dir),
      function (req: any, res: any) {
        const requestPath = path.resolve(`${dir}${req.url}`);

        fs.readdir(
          requestPath,
          {withFileTypes: true},
          (a: any, list: {name: any}[]) => {
            if (!list) {
              res.status(404).send(`resource not found: ${requestPath}`);
              return;
            }
            const title = `<h2>Current Dir: ${requestPath}</h2>`;
            const html =
              title +
              list
                .map((f: {name: any}) => f.name)
                .map((name: any) => `<a href='${name}'>${name}</a>`)
                .join('<br>');

            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
            res.status(200).send(html);
          }
        );
      },
    ]);
  }

  const server = app.listen(port);

  process.on('uncaughtException', function (err: any) {
    if (err['code'] === 'EACCES') {
      console.log(
        'EACCES error(lack of permission), use "run as Administrator" when you try to start the program'
      );
    } else {
      console.log('Caught exception: ', err);
    }
  });

  if (open) {
    ChromeLauncher.launch({
      startingUrl: `http://127.0.0.1:${port}/`,
      chromeFlags: ['--disable-web-security'],
    })
      .catch((e) => {
        console.log(
          "failed to launch chrome, pls start chrome with the flag '--disable-web-security' manually.",
          e
        );
      })
      .then(() => {
        process.on('exit', (code) => {
          console.log('Exit nd kill launched chrome');
          ChromeLauncher.killAll();
        });
      });
  }

  return server;
}

function handle404(err, serverResp, next) {
  console.warn(`sending 404 for ${serverResp?.originalUrl}`);
  serverResp.status(404).send('404!');
  next();
}

function handleSPA({dir, indexFile}: {dir: string; indexFile: string}) {
  return (req: Request, res: any) => {
    const requestPath = path.resolve(`${dir}${req.url}`);

    fs.readdir(requestPath, {withFileTypes: true}, () => {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync(`${dir}/${indexFile}`));
      res.end();
      return;
    });
  };
}

export {run, MODE};

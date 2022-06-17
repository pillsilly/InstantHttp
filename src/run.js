const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ChromeLauncher = require('chrome-launcher');
const compression = require('compression');
const {version} = require('../package.json');
module.exports = MODE = {
  NORMAL: 'NORMAL',
  SPA: 'SPA',
};
module.exports = function run({
  port,
  dir,
  proxyTarget,
  proxyPattern,
  open,
  mode,
  indexFile,
  quiet
} ) {
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
    if(!quiet) console.log(`Incoming request: ${req.originalUrl}`);

    next();
  });

  console.log(`Serving dir [${dir}]`);
  console.log(`Serving port ${port}`);

  if (!fs.existsSync(path.resolve(dir))) {
    throw Error(`Dir [${dir}] does not exit`);
  }

  app.use([
    cors(),
    compression(),
    router,
    express.static(dir),
    mode === MODE.SPA ? handleSPA({dir, indexFile}) : handle404,
  ]);

  app.use(function (req, res, next) {
    const requestPath = path.resolve(`${dir}${req.url}`);

    fs.readdir(requestPath, {withFileTypes: true}, (a, list) => {
      if (!list) {
        res.status(404).send(`resource not found: ${requestPath}`);
        return;
      }
      const title = `<h2>Current Dir: ${requestPath}</h2>`;
      const html =
        title +
        list
          .map((f) => f.name)
          .map((name) => `<a href='${name}'>${name}</a>`)
          .join('<br>');

      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.status(200).send(html);
    });
  });

  const server = app.listen(port);

  process.on('uncaughtException', function (err) {
    if (err.code === 'EACCES') {
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
};

function handle404(err, req, res, next) {
  console.error(err.stack);
  res.status(404).send('404!');
}

function handleSPA({dir, indexFile}) {
  return (req, res, next) => {
    const requestPath = path.resolve(`${dir}${req.url}`);

    fs.readdir(requestPath, {withFileTypes: true}, () => {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync(`${dir}/${indexFile}`));
      res.end();
      return;
    });
  };
}

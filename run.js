const express = require("express");
const process = require('process');
const cors = require('cors');
const path = require('path')
const fs = require('fs');
const ChromeLauncher = require('chrome-launcher');
const compression = require('compression');
const packagejson = require('./package.json')
module.exports = function run({ port = 9090, dir = process.cwd(), proxyTarget, proxyPattern, open = true }) {
    console.log(`Version: ${packagejson.version}`)
    const app = express();
    if (proxyTarget && proxyPattern) {
        const { createProxyMiddleware } = require('http-proxy-middleware');
        app.use(proxyPattern, createProxyMiddleware({ target: proxyTarget, changeOrigin: true, secure: false }));
    }
    const router = express.Router();
    router.get('/*', function (req, res, next) {
        console.log(`Incoming request: ${req.originalUrl}`);
        next();
    });

    console.log(`Serving dir [${dir}]`);
    console.log(`Serving port ${port}`);

    app.use([cors(), compression(), router, express.static(dir), handle404]);

    app.use(function (req, res, next) {
        const requestPath = path.resolve(`${dir}${req.url}`);

        fs.readdir(requestPath, { withFileTypes: true }, (a, list) => {
            if (!list) {
                res.status(404).send(`resource not found: ${requestPath}`);
                return;
            };
            const title = `<h2>Current Dir: ${requestPath}</h2>`;
            const html = title + list
                .map(f => f.name)
                .map(name => `<a href='${name}'>${name}</a>`).join('<br>');

            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
            res.status(200).send(html);
        });
    });

    app.listen(port);

    process.on('uncaughtException', function (err) {
        if (err.code === 'EACCES') {
            console.log('EACCES error(lack of permission), use "run as Administrator" when you try to start the program');
        } else {
            console.log('Caught exception: ', err);
        }
    });

    if (open) {
        ChromeLauncher.launch({
            startingUrl: `http://127.0.0.1:${port}/`,
            chromeFlags: ['--disable-web-security']
        }).catch(e => {
            console.log('failed to launch chrome, pls start chrome with the flag \'--disable-web-security\' manually.', e);
        }).then(() => {
            process.on('exit', (code) => {
                console.log(`Exit and kill launched chrome`);
                ChromeLauncher.killAll();
            })
        });
    }
};

function handle404(err, req, res, next) {
    console.error(err.stack)
    res.status(404).send('404!')
}
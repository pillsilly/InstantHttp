## General introduction
> A command line tool to serve local directory with http protocol

## Installation
```text
# Install globally:
npm i instantly_http -g 
```

## Options

```bash
instant_http --help

Usage: instant_http  [global options]

Options:
  -V, --version                      output the version number
  -p --port [port]                   To point which port to use as the server address. (default: "9090")
  -d --dir [dir]                     Dir to serve (default: "abc")
  -pt --proxyTarget [proxyTarget]    Where the delegated communication targets to
  -pp --proxyPattern [proxyPattern]  URL matcher to be used to identify which url to proxy
  -o --open [open]                   Whether to open chrome automatically (default: false)
  -m --mode [mode]                   Which mode to use (default: "NORMAL")
  -i --indexFile [indexFile]         Index File location(relative to --dir) (default: "index.html")
  -q --quiet [quiet]                 Set it to false to see more debug outputs (default: false)
  -h, --help                         display help for command
```

## Examples

- In repository
	```bash
	node bin.js --open=false --port=8080 --proxyTarget=http://proxy-server:8080 --proxyPattern=/api/*
	````
	> This is going to serve the current dir `./` with local port 8080, while all the request under `/proxy` would be redirected to http://google.com

- Using under NodeJS-ready environment
	```javascript
  const instantly_http = require('instantly_http');
	instant_http --open=false --port=8080 --proxyTarget=http://proxy-server:8080 --proxyPattern=/api/*
	```
	> `npm -g instant_http` is required before that.

- Using binary
	```bash
	./instantHttp  --open=false --port=8080 --proxyTarget=http://google.com --proxyPattern=/proxy
	```
	> Check the section [Build](#Build) to know how to get an executable binary


## Build
- > [pkg](https://www.npmjs.com/package/pkg) is used as the package utility, please check pkg's document in order to build runnable binaries as you want.
  ```bash
  # e.g
  npx pkg . --targets=host --output instantHttp
  # or
  npm run build
  ```

## Test

- ```javascript
  npm run test
  ```

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
  -d --dir [dir]                     Dir to serve (default: "/home/frank/code/InstantHttp")
  -pt --proxyTarget [proxyTarget]    Where the delegated communication targets to
  -pp --proxyPattern [proxyPattern]  URL matcher to be used to identify which url to proxy
  -o --open [open]                   Whether to open chrome automatically (default: false)
  -m --mode [mode]                   Which mode to use (default: "NORMAL")
  -i --indexFile [indexFile]         Index File location(relative to --dir) (default: "index.html")
  -q --quiet [quiet]                 Set it to false to see more debug outputs (default: false)
  -h, --help                         display help for command
```

## Usages

### As a nodejs lib
```javascript
const instantly_http = require('instantly_http');
instant_http --open=false --port=8080 --proxyTarget=http://proxy-server:8080 --proxyPattern=/api/*
```

### As a binary
```bash
./instantHttp  --open=false --port=8080 --proxyTarget=http://google.com --proxyPattern=/proxy
```

## Build for portable binary
After checkout then install this repository, you can then try below commands to get an executable binary.

```
npm run build-binary
```

> [pkg](https://www.npmjs.com/package/pkg) is used as the package utility, please check pkg's document in order to build runnable binaries as you want.


## Test

```bash
npm run test
```

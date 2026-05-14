## General introduction
> A command line tool to serve local directories, or to run a static-first reverse proxy with optional HTTPS

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
  --proxyStaticFileWise              Serve static files first, then proxy everything else
  --https                            Enable HTTPS listener
  --httpsKey [httpsKey]              HTTPS private key file
  --httpsCert [httpsCert]            HTTPS certificate file
  -m --mode [mode]                   Which mode to use (default: "NORMAL")
  -i --indexFile [indexFile]         Index File location(relative to --dir) (default: "index.html")
  -q --quiet [quiet]                 Set it to false to see more debug outputs (default: false)
  -h, --help                         display help for command
```

### Proxy notes

- `--proxyStaticFileWise` reuses `--proxyTarget`.
- `--proxyStaticFileWise` is mutually exclusive with `--proxyPattern`.
- `--https` uses the existing `server.key` and `server.cert` in the package root unless `--httpsKey` / `--httpsCert` are provided.
- In `--proxyStaticFileWise` mode, `/` is served through `--indexFile`.

## Usages

### MJS/TS
```javascript
import {run} from 'instantly_http';
```

### CJS
```javascript
const {run} = require('instantly_http');
```

### As a binary
```bash
./instantHttp --port=8080 --proxyStaticFileWise --proxyTarget=http://127.0.0.1:4431 --https
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

## Breaking Changes
- **vNext**: Removed `--open` option and chrome launcher functionality. Server URL is now displayed prominently in terminal for easy clicking.

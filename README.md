# InstantHttp

> Static file server & reverse proxy with optional HTTPS — zero config, single binary.

[![npm version](https://img.shields.io/npm/v/instantly_http)](https://www.npmjs.com/package/instantly_http)
[![license](https://img.shields.io/npm/l/instantly_http)](https://github.com/pillsilly/InstantHttp/blob/master/LICENSE)

Serves a local directory over HTTP, proxies requests to a backend, or does both in static-first hybrid mode. Ships as an npm package, a CLI, or a standalone binary.

## Why

Frontend development means serving built artifacts against a backend you don't control — a staging API, a production backend, or a colleague's dev server. Writing a throwaway Express script each time, wiring up CORS, compression, and a proxy middleware is boilerplate that adds nothing to your actual work.

InstantHttp collapses that into a single command. No config files. No scaffolding. Point it at a directory, optionally give it a backend to proxy to, and you're done.

Two scenarios where this matters:

**Frontend-to-backend pairing.** You have a React, Vue, or Svelte build output and need to test it against a specific backend. `--proxyStaticFileWise` serves your static files first and proxies API calls to the backend. Switch backends by changing one flag — no code changes, no restart dance.

**Static apps that need HTTP.** Some HTML+CSS+JS prototypes, spec pages, or tool UIs only work over HTTP (service workers, `fetch` to local resources, ES modules that need a real origin). `instant_http --dir ./demo` is zero-code — faster than pulling a full dependency tree.

The binary build goes a step further: a single self-contained executable you can drop onto a CI runner or share with a teammate who doesn't have Node.

## Installation

```bash
npm i -g instantly_http
```

Or run without installing:

```bash
npx instantly_http --port 8080
```

## Quick start

```bash
# Serve current directory
instant_http

# Serve another directory on a different port
instant_http --dir ./public --port 3000

# SPA mode — all unmatched routes fall back to index.html
instant_http --mode SPA --dir ./dist

# Static files first, proxy everything else to backend
instant_http --proxyStaticFileWise --proxyTarget http://localhost:3001

# HTTPS with default bundled cert/key
instant_http --https
```

## CLI reference

| Option | Default | Description |
|---|---|---|
| `-p, --port` | `9090` | Server port |
| `-d, --dir` | `cwd` | Directory to serve |
| `-m, --mode` | `NORMAL` | Server mode: `NORMAL`, `SPA`, or `PROXY_STATIC_FILE_WISE` |
| `-i, --indexFile` | `index.html` | Index file (relative to `--dir`) for SPA fallback |
| `-t, --proxyTarget` | — | Backend URL to proxy requests to |
| `-P, --proxyPattern` | — | URL pattern to match for proxying (supports `*` wildcard) |
| `--proxyStaticFileWise` | `false` | Serve static files first, proxy everything else |
| `--https` | `false` | Enable HTTPS |
| `--httpsKey` | — | Path to HTTPS private key (defaults to bundled `server.key`) |
| `--httpsCert` | — | Path to HTTPS certificate (defaults to bundled `server.cert`) |
| `-q, --quiet` | `true` | Suppress request logs (`false` for debug output) |
| `-V, --version` | — | Print version |
| `-h, --help` | — | Print help |

## Modes

### NORMAL (default)

Serves static files from `--dir`. When a request matches a directory, renders a clickable directory listing. Missing files return a 404.

### SPA

Single Page Application mode. Serves static files AND falls back to `--indexFile` for any route that doesn't match a file on disk. Use this for React, Vue, or Angular apps with client-side routing.

### PROXY_STATIC_FILE_WISE

Hybrid mode. Serves static files from `--dir` first. Any request that doesn't match a static file gets proxied to `--proxyTarget`. Supports WebSocket upgrade for HMR/dev servers. `/` maps to `--indexFile`.

> **Note:** `--proxyStaticFileWise` reuses `--proxyTarget` and is mutually exclusive with `--proxyPattern`.

## Proxy

Two proxy strategies are available:

**Pattern-based** (`--proxyPattern` + `--proxyTarget`) — only requests matching the pattern are proxied. Everything else is served as static files.

```bash
# Proxy /api/* requests to backend, serve everything else from ./public
instant_http --dir ./public --proxyTarget http://localhost:3001 --proxyPattern /api/*
```

**Static-first** (`--proxyStaticFileWise`) — try the file system first, then proxy the rest.

```bash
# Dev mode: serve Vite build, proxy everything else (HMR, API) to dev server
instant_http --proxyStaticFileWise --proxyTarget http://localhost:5173
```

Proxy headers (`x-forwarded-for`, `x-forwarded-host`, `x-forwarded-proto`, `via`) are stripped from upstream requests to avoid proxy detection. The `referer` and `origin` headers are rewritten to match the target.

## HTTPS

Enable with `--https`. Uses bundled `server.key` and `server.cert` for development — **not for production**. Provide your own cert with `--httpsKey` and `--httpsCert`:

```bash
instant_http --https --httpsKey ./privkey.pem --httpsCert ./fullchain.pem
```

## Programmatic API

```js
// ESM
import { run } from 'instantly_http';

// CommonJS
const { run } = require('instantly_http');

const server = run({
  port: '8080',
  dir: './public',
  mode: 'SPA',
  indexFile: 'index.html',
  https: true,
  // httpsKey: './key.pem',
  // httpsCert: './cert.pem',
});

// server is an http.Server or https.Server instance
```

The `run()` function returns a Node.js `http.Server` (or `https.Server`) instance. Call `server.close()` to shut down.

## Build standalone binary

```bash
git clone https://github.com/pillsilly/InstantHttp
cd InstantHttp
npm install
npm run build-binary
```

Outputs a self-contained `instant_http` binary in `./executable/` — no Node.js runtime needed. Uses [pkg](https://www.npmjs.com/package/pkg) under the hood.

## Test

```bash
npm test
```

Coverage targets: 100% branches, functions, lines, and statements.

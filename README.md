## Options

- port
  - Default: 9090
  - Example: --port=9090
  - Explain: To point which port to use as the server address.

- dir
  - Default: Current directory
  - Example: --dir=c:/abc
  - Explain: To point which directory to serve as the server base directory.

- proxyPattern
  - Default: undefined
  - Example: --proxyPattern=/proxy
  - Explain: A pattern to be used as to find determinate which request to redirect to redirect to `proxyTarget`.
  - 
- proxyTarget
  - Default: undefined
  - Example: --proxyTarget=http://google.com
  - Explain: To point which target to redirect when request path matches with `proxyPattern`.

- open
  - Default: true
  - Example: --open=false
  - Explain: If not set (trure) then the application will try to launch your Chrome installed with the server address`e.g http://localhost:9090`.

## How to run
**Examples**:

- In repository:
	```bash
	node bin.js --open=false --port=8080 --proxyTarget=http://google.com --proxyPattern=/proxy
	````
	> This is going to serve the current dir `./` with local port 8080, while all the request under /prox would be redirected to http://google.com

- Using under NodeJS-ready environment.
	```bash
	instant_http --open=false --port=8080 --proxyTarget=http://google.com --proxyPattern=/proxy
	```
	> `npm -g instant_http` is required before that.

- Using binary
	```bash
	./instantHttp  --open=false --port=8080 --proxyTarget=http://google.com --proxyPattern=/proxy
	```
	> Check the section [Build](##Build) to know how to get a executable binary



## Build
- > [pkg](https://www.npmjs.com/package/pkg) is used as the package utility, please check pkg's document in order to build runnable binaries as you want.

 
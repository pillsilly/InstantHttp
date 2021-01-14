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

 
**Usage**: 
- For common user:
	- Option 1: 
	> Just click the downloaded exe file.(in this way everything will be run with default options as no options were passed)
	
	- Option 2:
    > execute the exe file via cmd so you would have a chance to pass additional options to the application, just like below example.
    
    `./instantHttp.exe --port=9092 --dir=C:\`
		
- For user who has NodeJS environment ready
	```bash
	// npm instal(of course)
	npm i -g https://github.com/pillsilly/InstantHttp
	
	// then run script(might need to restart the terminal to recognize the added command)
	InstantHttp
	```
	
**To build executable binary(exe)**: 
```bash
npm run-script build
```
or
```bash
pkg . --targets=host --output instantHttp.exe
``` 
 

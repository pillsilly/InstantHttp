**usage**: 

```bash
./httpoutofthebox.exe --port=9092 --dir=C:\repo\httpserver\public
```

**build**: 
```bash
npm run-script build
```
or
```bash
pkg . --targets=host --output httpoutofthebox.exe
``` 

**if you're attempting to connect eNB this way, you need to disable chrome sandbox in order to break cross origin limitation**:
 ```bash
 "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --user-data-dir=”C:\Users\frawu\AppData\Local\Temp\Chrome” --disable-web-security
 ```

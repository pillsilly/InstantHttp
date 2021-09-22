const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const cors = require('cors');
app.get('/:filename', cors(corsOptionsDelegate), function(req, res, next) {
  res.sendFile(__dirname + `/public/${req.params.filename}`);
});

https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
}, app).listen(9078);
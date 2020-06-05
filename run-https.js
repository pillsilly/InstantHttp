var express = require("express");
var app = express();
var https = require('https');
var fs = require('fs')
var cors = require('cors')
app.get('/:filename', cors(corsOptionsDelegate), function (req, res, next) {
    res.sendFile(__dirname + `/public/${req.params.filename}`);
});

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app).listen(9078);

import cors from 'cors';
import path from 'path';
import express from 'express';
import https from 'https';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';

const app = express();

app.get('/:filename', cors(), function (req: Request, res: Response, _next: NextFunction) {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  res.sendFile(path.join(__dirname, 'public', filename));
});

https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app).listen(9078);

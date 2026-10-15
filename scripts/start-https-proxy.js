#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { pipeline } = require('stream');

async function main() {
  const certDir = path.resolve(__dirname, '..', 'certs');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
  const keyPath = path.join(certDir, 'localhost-key.pem');
  const certPath = path.join(certDir, 'localhost.pem');

  let key;
  let cert;
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    key = fs.readFileSync(keyPath);
    cert = fs.readFileSync(certPath);
  } else {
    let selfsigned;
    try {
      selfsigned = require('selfsigned');
    } catch (err) {
      console.error('Please install the `selfsigned` package in the workspace: `npm install selfsigned`');
      console.error(err);
      process.exit(1);
    }

    try {
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = await selfsigned.generate(attrs, { days: 365 });
      if (!pems || !pems.private || !pems.cert) {
        console.error('selfsigned.generate returned unexpected result:', pems);
        process.exit(1);
      }
      key = pems.private;
      cert = pems.cert;
      fs.writeFileSync(keyPath, key);
      fs.writeFileSync(certPath, cert);
      console.log('Generated self-signed certificate at', certPath);
    } catch (err) {
      console.error('Failed to generate self-signed certificate with `selfsigned` package.');
      console.error(err);
      process.exit(1);
    }
  }

  const targetPort = process.env.TARGET_PORT || 3001;
  const listenPort = process.env.HTTPS_PORT || 3443;

  const server = https.createServer({ key, cert }, (req, res) => {
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      pipeline(proxyRes, res, (err) => {
        if (err) console.error('Proxy pipeline error:', err);
      });
    });
    req.pipe(proxyReq);
    proxyReq.on('error', (e) => {
      console.error('Proxy request error:', e);
      res.writeHead(502);
      res.end('Bad gateway');
    });
  });

  server.listen(listenPort, () => {
    console.log(`HTTPS proxy listening on https://localhost:${listenPort} and proxying to http://localhost:${targetPort}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

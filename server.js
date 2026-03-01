"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_PORT = 5500;
const MAX_PORT_RETRIES = 25;
const ROOT = __dirname;
const requestedPort = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
let currentPort = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : DEFAULT_PORT;
let retriesLeft = MAX_PORT_RETRIES;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".obj": "text/plain; charset=utf-8",
  ".mtl": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const target = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(ROOT, target));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url || "/");
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    res.statusCode = 200;
    res.end(data);
  });
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE" && retriesLeft > 0) {
    const nextPort = currentPort + 1;
    console.warn(`Port ${currentPort} is in use. Trying ${nextPort}...`);
    currentPort = nextPort;
    retriesLeft -= 1;
    setTimeout(() => server.listen(currentPort), 80);
    return;
  }

  console.error("Server failed to start:", error.message);
  process.exit(1);
});

server.listen(currentPort, () => {
  console.log(`Pirate Sea Dash server running at http://localhost:${currentPort}`);
});

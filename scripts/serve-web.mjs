// Copied next to index.html in the portable web test package. No npm install.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
import console from "node:console";
import process from "node:process";

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const path = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1:4173").pathname,
    );
    const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
server.on("error", (error) => {
  console.error(`Cannot start local preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(4173, "127.0.0.1", () =>
  console.log("LumaWindow: http://127.0.0.1:4173/  (Ctrl+C to stop)"),
);

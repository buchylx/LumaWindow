// Local developer recording receiver; no scene data or media leaves the machine.
import { createServer } from "node:http";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import console from "node:console";
const directory = resolve(".local/recordings");
await mkdir(directory, { recursive: true });
const output = resolve(directory, `cloudsea-${Date.now()}.webm`);
let receiving = false;
const server = createServer(async (req, res) => {
  if (
    req.headers.origin !== "http://127.0.0.1:5173" ||
    req.url !== "/capture"
  ) {
    res.writeHead(403).end();
    return;
  }
  const headers = {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers).end();
    return;
  }
  if (req.method !== "POST" || receiving) {
    res.writeHead(405, headers).end();
    return;
  }
  receiving = true;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 96 * 1048576) throw Error("Recording exceeds 96 MiB");
      chunks.push(chunk);
    }
    await writeFile(output, Buffer.concat(chunks));
    console.log(`Saved ${output} (${size} bytes)`);
    res.writeHead(200, headers).end("Saved");
    server.close();
  } catch (error) {
    console.error(error);
    res.writeHead(413, headers).end("Failed");
    receiving = false;
  }
});
server.listen(5186, "127.0.0.1", () =>
  console.log(`Recording receiver: ${output}`),
);
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

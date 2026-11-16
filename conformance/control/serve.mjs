#!/usr/bin/env node
// Collects results from conformance/control/subpackage. Writes the collector URL into its config.js.
//   node conformance/control/serve.mjs [--host 192.168.x.x]   (use your LAN IP for a real device)
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const hostIndex = process.argv.indexOf("--host");
const host = hostIndex > 0 ? process.argv[hostIndex + 1] : "127.0.0.1";
const runId = Date.now().toString(36);

const server = createServer(async (request, response) => {
  let body = "";
  for await (const part of request) body += part;
  let data = {};
  try {
    data = JSON.parse(body || "{}");
    if (typeof data === "string") data = JSON.parse(data);
  } catch {}
  response.writeHead(200, { "content-type": "application/json" });
  response.end("{}");
  if (data.runId !== runId) return;
  console.log(JSON.stringify(data, null, 2));
  if (request.url === "/done") {
    server.close();
    process.exit(0);
  }
});

server.listen(0, host === "127.0.0.1" ? "127.0.0.1" : "0.0.0.0", () => {
  const url = `http://${host}:${server.address().port}`;
  writeFileSync(path.join(here, "subpackage/config.js"), `module.exports = ${JSON.stringify({ collector: url, runId })};\n`);
  console.log(`collector ${url} (run ${runId}); compile conformance/control/subpackage in DevTools now`);
});

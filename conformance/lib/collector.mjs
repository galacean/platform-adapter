// HTTP server that the conformance game reports to, and that serves assets for the "remote" cases.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME = { ".png": "image/png", ".json": "application/json", ".txt": "text/plain; charset=utf-8" };

/**
 * @param host address the game uses to reach this server: 127.0.0.1 for a simulator, the LAN address for a device
 * @param accept reports for which this returns false are ignored (for example the simulator's during a device run)
 */
export function startCollector({ assetsDir, runId, host = "127.0.0.1", accept = () => true, onResult = () => {} }) {
  const results = [];
  let started = null;
  let done = null;
  let resolveDone;
  const finished = new Promise((resolve) => (resolveDone = resolve));

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://collector");
      if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
        const name = path.basename(decodeURIComponent(url.pathname));
        const content = await readFile(path.join(assetsDir, name));
        response.writeHead(200, { "content-type": MIME[path.extname(name)] ?? "application/octet-stream" });
        response.end(content);
        return;
      }
      if (request.method === "POST") {
        let body = "";
        for await (const part of request) body += part;
        let data = JSON.parse(body || "{}");
        // wx.request may deliver the JSON string we stringified as a quoted string.
        if (typeof data === "string") data = JSON.parse(data);
        // Ignore reports from a game instance of an earlier run that is still open.
        if ((runId && data.runId !== runId) || !accept(data)) {
          response.writeHead(409);
          response.end("{}");
          return;
        }
        if (url.pathname === "/start") started = { ...data, at: Date.now() };
        if (url.pathname === "/result") {
          results.push(data);
          onResult(data);
        }
        if (url.pathname === "/done") {
          done = data;
          resolveDone();
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end("{}");
        return;
      }
      response.writeHead(404);
      response.end();
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });

  return new Promise((resolve) => {
    // A device reaches the server through the LAN address, so listen on every interface for it.
    server.listen(0, host === "127.0.0.1" ? host : "0.0.0.0", () => {
      const { port } = server.address();
      resolve({
        url: `http://${host}:${port}`,
        results,
        get started() {
          return started;
        },
        get done() {
          return done;
        },
        finished,
        close: () => new Promise((r) => server.close(() => r()))
      });
    });
  });
}

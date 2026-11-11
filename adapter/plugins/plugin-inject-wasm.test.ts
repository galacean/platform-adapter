import { describe, it, expect } from 'vitest';
import { rollup } from 'rollup';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { injectWASM } from './plugin-inject-wasm.js';

// Shape of the Emscripten glue in @galacean/engine-physics-physx 2.0 (libs/physx.release.js).
const awaitGlue = `
var PHYSX = (() => {
  var wasmBinaryFile;
  function locateFile(path) { return path; }
  function findWasmBinary() { return locateFile("physx.release.wasm"); }
  async function instantiateAsync(binary, binaryFile, imports) {
    var response = fetch(binaryFile, { credentials: "same-origin" });
    return WebAssembly.instantiateStreaming(response, imports);
  }
  async function createWasm() {
    function receiveInstantiationResult(result) { return result["instance"].exports; }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(null, wasmBinaryFile, { a: {} });
    return receiveInstantiationResult(result);
  }
  return createWasm;
})();
module.exports = PHYSX;
`;

async function build(source: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-wasm-'));
  const entry = path.join(dir, 'physx.release.js');
  fs.writeFileSync(entry, source);
  const bundle = await rollup({ input: entry, plugins: [injectWASM('WXWebAssembly', ['physx.release.js'])], treeshake: false, onwarn() {} });
  const { output } = await bundle.generate({ format: 'es' });
  return output[0].code;
}

describe('injectWASM', () => {
  it('loads the local subpackage WASM by path for await-style Emscripten glue', async () => {
    const code = await build(awaitGlue);
    expect(code).toContain('return "/public/wasmSubpackage/physx.release.wasm"');
    expect(code).toContain('WXWebAssembly.instantiate(binaryFile, imports)');
    expect(code).not.toContain('instantiateStreaming');
    expect(code).toContain('window.PHYSX = PHYSX');
  });

  it('drops the Node branch of the glue, which Douyin cannot compile', async () => {
    const code = await build(`
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
var readBinary, scriptDirectory = "";
if (ENVIRONMENT_IS_NODE) {
  var fs = require("node:fs");
  readBinary = (filename) => fs.readFileSync(filename);
} else if (globalThis.window) {
  scriptDirectory = "web/";
}
if (ENVIRONMENT_IS_NODE) { process.on("exit", () => {}); }
${awaitGlue}`);
    expect(code).not.toContain('node:fs');
    expect(code).not.toContain('readFileSync');
    expect(code).not.toContain('process.on');
    expect(code).toMatch(/ENVIRONMENT_IS_NODE\s*=\s*false/);
    // The else branch stays, and the rest of the glue is still patched.
    expect(code).toContain('scriptDirectory = "web/"');
    expect(code).toContain('WXWebAssembly.instantiate(binaryFile, imports)');
  });

  it('keeps the statements around a Node branch that is not a statement of its own', async () => {
    const code = await build(`
var ENVIRONMENT_IS_NODE = typeof process == "object";
var IS_WEB = typeof window == "object";
var x = 0, y = 0;
if (IS_WEB) { x = 1; } else if (ENVIRONMENT_IS_NODE) { x = require("node:fs"); }
y = 9;
if (IS_WEB) if (ENVIRONMENT_IS_NODE) { x = require("node:path"); }
y = 10;
${awaitGlue}`);
    expect(code).not.toContain('node:');
    // `y = 9` and `y = 10` must not become the body of the `else` or of the outer `if`.
    expect(code).toMatch(/else if \(ENVIRONMENT_IS_NODE\) \{\}\s*y = 9;/);
    expect(code).toMatch(/if \(IS_WEB\) if \(ENVIRONMENT_IS_NODE\) \{\}\s*y = 10;/);
  });

  it('fails on await-style glue it cannot patch', async () => {
    await expect(build(`function findWasmBinary() { return "x.wasm"; }\nmodule.exports = 1;`)).rejects.toThrow(/unsupported Emscripten glue/);
  });
});

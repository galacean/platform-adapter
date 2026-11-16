import { describe, it, expect } from 'vitest';
import { rollup } from 'rollup';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pluginReplaceSIMDSupported } from './plugin-replace-simd.js';

describe('pluginReplaceSIMDSupported', () => {
  it('replaces the WebAssembly SIMD probe with false', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replace-simd-'));
    const entry = path.join(dir, 'node_modules/@galacean/engine/browser.js');
    fs.mkdirSync(path.dirname(entry), { recursive: true });
    fs.writeFileSync(entry, `export const SystemInfo = { _simdSupported: null, detect() { if (this._simdSupported === null) { this._simdSupported = WebAssembly.validate(new Uint8Array([0])); } return this._simdSupported; } };`);
    const bundle = await rollup({ input: entry, plugins: [pluginReplaceSIMDSupported()], onwarn() {} });
    const { output } = await bundle.generate({ format: 'es' });
    expect(output[0].code).not.toContain('WebAssembly.validate');
    expect(output[0].code).toContain('this._simdSupported = false');
  });
});

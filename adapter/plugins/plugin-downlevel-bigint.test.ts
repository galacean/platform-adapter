import { describe, it, expect } from 'vitest';
import { rollup } from 'rollup';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { downlevelBigInt } from './plugin-downlevel-bigint.js';

/** A BigInt literal of any radix. Written here on its own, not imported from the plugin under test. */
const bigIntLiteral = /\b(?:0x[\da-f_]+|0o[0-7_]+|0b[01_]+|\d[\d_]*)n\b/i;

async function build(source: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'downlevel-bigint-'));
  const entry = path.join(dir, 'entry.js');
  fs.writeFileSync(entry, source);
  const bundle = await rollup({ input: entry, plugins: [downlevelBigInt()], treeshake: false, onwarn() {} });
  const { output } = await bundle.generate({ format: 'es' });
  return output[0].code;
}

describe('downlevelBigInt', () => {
  it('writes BigInt literals as BigInt() calls with the same value', async () => {
    // The shape in Engine's PhysX glue: `const isUnsignedType = minRange === 0n`.
    const code = await build(`export const isUnsigned = (minRange) => minRange === 0n;\nexport const big = -9007199254740993n + 0x1fn;`);
    expect(code).not.toMatch(bigIntLiteral);
    expect(code).toContain('minRange === BigInt("0")');
    const module = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    expect(module.isUnsigned(BigInt(0))).toBe(true);
    expect(module.big).toBe(BigInt('-9007199254740993') + BigInt(31));
  });

  it('keeps a BigInt literal property key as the property it names', async () => {
    const code = await build(`export const table = { 1n: "one" };`);
    expect(code).not.toMatch(bigIntLiteral);
    const module = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    expect(module.table['1']).toBe('one');
  });

  it('rewrites a module whose only BigInt literals end in a hex letter', async () => {
    // What swc leaves at es2017, minified or not: a hex literal too large to print as decimal.
    const code = await build(`export const mask = 0xffffffffffffffffn;\nexport const upper = 0XABCDEFn;`);
    expect(code).toContain('BigInt("18446744073709551615")');
    expect(code).toContain('BigInt("11259375")');
    expect(code).not.toMatch(bigIntLiteral);
    const module = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    expect(module.mask).toBe(BigInt('18446744073709551615'));
    expect(module.upper).toBe(BigInt(0xabcdef));
  });

  it('rewrites binary, octal and separated literals', async () => {
    const code = await build(`export const values = [0b1010n, 0o17n, 1_000n];`);
    const module = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    expect(code).not.toMatch(bigIntLiteral);
    expect(module.values).toEqual([BigInt(10), BigInt(15), BigInt(1000)]);
  });

  it('leaves code without BigInt literals unchanged', async () => {
    expect(await build(`export const name = "0n"; export const id = x1n;`)).toContain('const id = x1n');
  });
});

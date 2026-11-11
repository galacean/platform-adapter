import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { resolveDependencyScript } from './DependencyScript.js';

function makePackage(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-script-'));
  files.forEach(file => fs.outputFileSync(path.join(dir, file), ''));
  return dir;
}

describe('resolveDependencyScript', () => {
  it('uses the UMD bundle of a package that declares umd (Engine 2.0 has no browser field)', () => {
    const dir = makePackage(['dist/browser.js', 'dist/main.js']);
    expect(resolveDependencyScript(dir, { name: '@galacean/engine', version: '2.0.0', main: 'dist/main.js', umd: 'Galacean' })).toBe('dist/browser.js');
  });

  it('fails when a Galacean package declares umd but has no UMD bundle', () => {
    const dir = makePackage(['dist/main.js']);
    expect(() => resolveDependencyScript(dir, { name: '@galacean/engine', version: '2.0.0', main: 'dist/main.js', umd: 'Galacean' })).toThrow(/dist\/browser\.js/);
  });

  it('keeps browser, then main, for packages without umd', () => {
    const dir = makePackage([]);
    expect(resolveDependencyScript(dir, { name: 'lib', version: '1.0.0', main: 'index.js', browser: 'browser.js' })).toBe('browser.js');
    expect(resolveDependencyScript(dir, { name: 'lib', version: '1.0.0', main: 'index.js' })).toBe('index.js');
  });
});

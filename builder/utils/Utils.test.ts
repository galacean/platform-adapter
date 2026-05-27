import { describe, it, expect } from 'vitest';
import { escapeGlob, normalizePath } from './Utils.js';

describe('normalizePath', () => {
  it('converts Windows backslashes to forward slashes', () => {
    expect(normalizePath(String.raw`C:\Users\test\file.js`)).toBe('C:/Users/test/file.js');
  });

  it('leaves Unix paths unchanged', () => {
    expect(normalizePath('/Users/test/file.js')).toBe('/Users/test/file.js');
  });
});

describe('escapeGlob', () => {
  it('escapes glob special characters', () => {
    expect(escapeGlob('file[1].js')).toBe(String.raw`file\[1\].js`);
    expect(escapeGlob('file?.js')).toBe(String.raw`file\?.js`);
    expect(escapeGlob('file*.js')).toBe(String.raw`file\*.js`);
    expect(escapeGlob('file{a,b}.js')).toBe(String.raw`file\{a,b\}.js`);
  });

  it('normalizes Windows paths before escaping', () => {
    expect(escapeGlob(String.raw`C:\Users\test\file.js`)).toBe('C:/Users/test/file.js');
  });

  it('handles Windows paths with glob characters', () => {
    expect(escapeGlob(String.raw`C:\Users\a\[b]\c?.js`)).toBe(String.raw`C:/Users/a/\[b\]/c\?.js`);
  });

  it('handles Windows paths with spaces', () => {
    expect(escapeGlob(String.raw`C:\Users\User Name\project\file.js`)).toBe('C:/Users/User Name/project/file.js');
  });

  it('handles npm scoped package paths on Windows', () => {
    expect(escapeGlob(String.raw`C:\Users\test\node_modules\@galacean\engine\dist\browser.js`))
      .toBe('C:/Users/test/node_modules/@galacean/engine/dist/browser.js');
  });
});

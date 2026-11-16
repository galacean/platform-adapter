import { describe, it, expect } from 'vitest';
import { decodeDataURL, isDataURL } from './DataURL';

describe('decodeDataURL', () => {
  it('decodes base64 payloads (glTF embedded buffers)', () => {
    expect(isDataURL('data:application/octet-stream;base64,AAEC/w==')).toBe(true);
    expect(Array.from(decodeDataURL('data:application/octet-stream;base64,AAEC/w=='))).toEqual([0, 1, 2, 255]);
  });

  it('decodes percent-encoded payloads', () => {
    expect(Array.from(decodeDataURL('data:text/plain,a%20b'))).toEqual([97, 32, 98]);
  });

  it('decodes percent-encoded UTF-8 text to its bytes', () => {
    // "中" is E4 B8 AD in UTF-8.
    expect(Array.from(decodeDataURL('data:text/plain,%E4%B8%AD'))).toEqual([0xe4, 0xb8, 0xad]);
    expect(Array.from(decodeDataURL('data:text/plain,中'))).toEqual([0xe4, 0xb8, 0xad]);
  });

  it('decodes percent-encoded bytes that are not valid UTF-8', () => {
    expect(Array.from(decodeDataURL('data:application/octet-stream,%FF%00%80'))).toEqual([255, 0, 128]);
  });

  it('keeps a percent sign that does not start an escape', () => {
    expect(Array.from(decodeDataURL('data:text/plain,100%25%zz'))).toEqual([49, 48, 48, 37, 37, 122, 122]);
  });

  it('does not treat file paths as data URLs', () => {
    expect(isDataURL('public/a.bin')).toBe(false);
  });
});

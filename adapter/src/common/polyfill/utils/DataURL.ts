import { atob } from "../Base64";

/**
 * Decodes a `data:` URL into bytes. Mini-game file systems and `request` APIs do not accept
 * data URLs, so `XMLHttpRequest` routes them here (for example glTF buffers embedded as base64).
 */
export function isDataURL(url: string): boolean {
  return /^data:/i.test(url);
}

export function decodeDataURL(url: string): Uint8Array {
  const comma = url.indexOf(",");
  if (comma < 0) {
    throw new Error(`Invalid data URL: ${url.slice(0, 32)}`);
  }
  const meta = url.slice(5, comma);
  const payload = url.slice(comma + 1);
  if (/;base64$/i.test(meta)) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return percentDecode(payload);
}

/**
 * Percent-decodes to bytes, as the Fetch standard does for data URLs: `%XX` is the byte XX, whatever
 * it encodes (UTF-8 text or binary), and any other character is written as UTF-8.
 */
function percentDecode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x25 && /^[0-9a-f]{2}$/i.test(text.substr(i + 1, 2))) {
      bytes.push(parseInt(text.substr(i + 1, 2), 16));
      i += 2;
    } else if (code < 0x80) {
      bytes.push(code);
    } else {
      // A literal non-ASCII character: its UTF-8 bytes. Surrogate pairs form one code point.
      let point = code;
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const low = text.charCodeAt(i + 1);
        if (low >= 0xdc00 && low <= 0xdfff) {
          point = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
          i++;
        }
      }
      if (point < 0x800) {
        bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
      } else if (point < 0x10000) {
        bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
      } else {
        bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
      }
    }
  }
  return new Uint8Array(bytes);
}

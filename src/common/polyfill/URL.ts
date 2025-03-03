import { btoa } from "./Base64";
import { Blob } from "./Blob";
import { URLSearchParams } from "./URLSearchParams";

export class URL {
  /**
   * fake createObject, use base64 instead
   * @param blob
   */
  static createObjectURL(blob: Blob) {
    const buffer = blob.buffers[0];
    const type = typeof blob.type === "object" ? blob.type.type : blob.type;
    const base64 = _arrayBufferToBase64(buffer);
    const prefix = `data:${type};base64,`;
    return prefix + base64;
  }

  static revokeObjectURL(url: string) {
    // Do nothing
  }
  
  public href: string;
  public origin: string;
  public pathname: string;
  public protocol: string;
  public host: string;
  public hostname: string;
  public port: string;
  public search: string;
  public searchParams: URLSearchParams;

  // todo: 完善URL对象
  constructor(url: string, base = "") {
    const resolvedURL = parseURL(url);
    if (resolvedURL) {
      let whereQuery = indexOfQueryString(url);
      if (whereQuery > -1) {
        const query = url.substring(whereQuery);
        this.search = query;
        this.searchParams = new URLSearchParams(query);
      }
      // 没有解析到协议，则解析 base
      if (!resolvedURL[1]) {
        if (base) {
          const resolvedBase = parseURL(base);
          // 没有解析到协议，抛出异常
          if (!resolvedBase[1]) {
            throw new TypeError(`Failed to construct 'URL': Invalid URL ${url}, base ${base}`);
          }

          whereQuery = url.indexOf(this.search);
          if (whereQuery > -1) {
            this.pathname = url.substring(0, whereQuery);
          } else {
            this.pathname = url;
          }

          whereQuery = indexOfQueryString(resolvedBase[3]);
          if (whereQuery > -1) {
            resolvedBase[3] = resolvedBase[3].slice(0, whereQuery);
          }

          // 融合 url 和 base
          if (!url.startsWith('/')) {
            whereQuery = resolvedBase[3].lastIndexOf('/');
            if (whereQuery > -1) {
              this.pathname = resolvedBase[3].substring(0, whereQuery + 1) + this.pathname;
            }
          }
          this.protocol = resolvedBase[1].split('//')[0];
          if (this.protocol !== 'files:') {
            this.origin = resolvedBase[1] + resolvedBase[2];
            this.host = resolvedBase[2];
          } else {
            this.origin = "null";
            this.host = "";
          }
        } else {
          throw new TypeError(`Failed to construct 'URL': Invalid URL ${url}`);
        }
      } else {
        whereQuery = resolvedURL[3].indexOf(this.search);
        if (whereQuery > -1) {
          this.pathname = resolvedURL[3].substring(0, whereQuery);
        } else {
          this.pathname = resolvedURL[3];
        }
        this.protocol = resolvedURL[1].split('//')[0];
        if (this.protocol !== 'files:') {
          this.origin = resolvedURL[1] + resolvedURL[2];
          this.host = resolvedURL[2];
        } else {
          this.origin = "null";
          this.host = "";
          this.pathname = resolvedURL[2] + this.pathname;
        }
      }
      const hostAndPort = this.host.split(':');
      this.hostname = hostAndPort[0];
      this.port = hostAndPort.length > 1 ? hostAndPort[1] : "";
      this.pathname = normalizePath(this.pathname);
      this.href = (this.origin && this.origin !== "null" ? this.origin : this.protocol + '//') + this.pathname + (this.search ?? '');
    } else {
      throw new TypeError(`Failed to construct 'URL': Invalid URL ${url}`);
    }
  }
}

function _arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0, len = bytes.byteLength; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Parses the given URL string and returns its components.
 *
 * @param {string} url - The URL string to be parsed.
 * @returns {Array} An array in the format [url, protocol, host, path].
 * - `url`: The original, complete URL string.
 * - `protocol`: The protocol part of the URL (e.g., 'http', 'https', 'ftp', etc.).
 * - `host`: The host part of the URL (including the domain and optional port number).
 * - `path`: The path part of the URL (the section after the host and before any query parameters).
 */
function parseURL(url: string): Array<string> {
  return /(.+:\/\/)?([^\/]*)(\/.*)*/i.exec(url);
}

function indexOfQueryString(url: string): number {
  return url.indexOf('?');
}

/**
 * Normalizes the given path string.
 *
 * @param path 
 * @returns 
 */
function normalizePath(path: string): string {
  const pathParts = path.split('/');
  const normalizedPathParts = [];
  for (let i = 0, len = pathParts.length; i < len; i++) {
    if (pathParts[i] === '.') {
      continue;
    } else if (pathParts[i] === '..') {
      if (normalizedPathParts.length > 1) {
        normalizedPathParts.pop();
      }
    } else {
      normalizedPathParts.push(pathParts[i]);
    }
  }
  return normalizedPathParts.join('/');
}

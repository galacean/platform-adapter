import { btoa } from "./Base64";
import { Blob } from "./Blob";

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

  static urlRegex = /(.+:\/\/)?([^\/]+)(\/.*)*/i;

  // todo: 完善URL对象
  constructor(url: string, host = "") {
    const match = URL.urlRegex.exec(url);
    try {
      if (match) {
          this.href = match[0];
          this.origin = match[1] + match[2];
          this.pathname = match[3];
          this.protocol = match[1].split('//')[0];
          this.host = match[2] ?? "";
          const hostAndPort = this.host.split(':');
          this.hostname = hostAndPort[0];
          this.port = hostAndPort[1];
          return;
      }
      this.href = host + url;
      this.origin = host.split("/")[0];
      this.pathname = url;
    } catch (err) {
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
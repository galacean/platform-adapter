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

  // todo: 完善URL对象
  constructor(url, host = "") {
    if (url.indexOf("http://") == 0 || url.indexOf("https://") == 0) {
      this.href = url;
      return;
    }
    this.href = host + url;
  }
}

function _arrayBufferToBase64(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
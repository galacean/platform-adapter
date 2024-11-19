export default class TextDecoder {
  /**
   * 不支持 UTF-8 code points 大于 1 字节
   * @see https://stackoverflow.com/questions/17191945/conversion-between-utf-8-arraybuffer-and-string
   * @param {Uint8Array|ArrayBuffer} uint8Array
   */
  decode(input: ArrayBuffer | Uint8Array) {
    const uint8Array: Uint8Array = input instanceof ArrayBuffer ? new Uint8Array(input) : input;

    // from threejs LoaderUtils.js
    let s = '';

    // Implicitly assumes little-endian.
    for (let i = 0, il = uint8Array.length; i < il; i++) {
      s += String.fromCharCode(uint8Array[i]);
    }

    try {
      // merges multi-byte utf-8 characters.
      return decodeURIComponent(escape(s));
    } catch (e) {
      // see #16358
      return s;
    }
    // return String.fromCharCode.apply(null, uint8Array);
  }
}

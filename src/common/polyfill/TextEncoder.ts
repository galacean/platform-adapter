import utils from '../utils/Utils';

class Stream {
  public static endOfStream = -1;

  constructor(public tokens: number[]) {
    this.tokens = [].slice.call(tokens);
    this.tokens.reverse();
  }

  read(): number {
    if (!this.tokens.length) {
      return Stream.endOfStream;
    }
    return this.tokens.pop();
  }

  prepend(token: number | number[]): void {
    if (Array.isArray(token)) {
      const { tokens: _tokens } = this;
      let tokens = token;
      while (tokens.length) {
        _tokens.push(tokens.pop());
      }
    } else {
      this.tokens.push(token);
    }
  }

  push(token: number | number[]): void {
    if (Array.isArray(token)) {
      const { tokens: _tokens } = this;
      let tokens = token;
      while (tokens.length) {
        _tokens.unshift(tokens.shift());
      }
    } else {
      this.tokens.unshift(token);
    }
  }

  endOfStream(): boolean {
    return !this.tokens.length;
  }

}

interface Encoder {
  handler: (stream: Stream, codePoint: number) => number | number[];
}

type EncoderFactory = {
  [name: string]: (options: { fatal: boolean }) => Encoder
}

type Encoding = {
  name: string,
  labels: string[]
}

type Encodings = {
  heading: string,
  encodings: Encoding[],
}

export default class TextEncoder {
  public static DEFAULT_ENCODING = 'utf-8';

  public static finished: number = -1;
  public static encoders: EncoderFactory = {};


  public static encodings: Encodings[] = [
    {
      "encodings": [
        {
          "labels": [
            "unicode-1-1-utf-8",
            "utf-8",
            "utf8"
          ],
          "name": "UTF-8"
        }
      ],
      "heading": "The Encoding"
    },
  ];

  public static label2encoding: { [name: string]: { name: string, labels: string[] } } = { };

  private static getEncoding(label: string): { name: string, labels: string[] } {
    label = label.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TextEncoder.label2encoding, label)) {
      return TextEncoder.label2encoding[label];
    }
    return null;
  }

  private static stringToCodePoints(text: string): number[] {
    let s = text;
    let n = s.length;
    let i = 0;
    let u = [];
    while (i < n) {
      let c = s.charCodeAt(i);
      if (c < 0xD800 || c > 0xDFFF) {
        u.push(c);
      } else if (c >= 0xDC00 && c <= 0xDFFF) {
        u.push(0xFFFD);
      } else if (c >= 0xD800 && c <= 0xDBFF) {
        if (i === n - 1) {
          u.push(0xFFFD);
        } else {
          let d = s.charCodeAt(i + 1);
          if (d >= 0xDC00 && d <= 0xDFFF) {
            let a = c & 0x3FF;
            let b = d & 0x3FF;
            u.push(0x10000 + (a << 10) + b);
            i += 1;
          } else {
            u.push(0xFFFD);
          }
        }
      }
      i += 1;
    }
    return u;
  }

  static encoderError(codePoint: number): number {
    throw TypeError('The code point ' + codePoint + ' could not be encoded.');
  }

  private _encoding: Encoding = undefined;
  private _encoder: Encoder = undefined;
  private _notFlush: boolean = false;
  private _fatal: 'fatal' | 'replacement' = 'replacement';

  get encoding(): string {
    return this._encoding.name.toLowerCase();
  }

  constructor(label?: string, options?: object) {
    options = utils.toDictionary(options);
    this._fatal = !!options['fatal'] ? 'fatal' : 'replacement';

    let encoder = this;
    if (!!options['NONSTANDARD_allowLegacyEncoding']) {
      label = label !== undefined ? label : TextEncoder.DEFAULT_ENCODING;
      var encoding = TextEncoder.getEncoding(label);
      if (!encoding || encoding.name === 'replacement') {
        throw RangeError('Unknown encoding: ' + label);
      }
      if (!TextEncoder.encodings[encoding.name]) {
        throw Error('Encoder not present. Did you forget to include encoding-indexes.js first?');
      }
      encoder._encoding = encoding;
    } else {
      encoder._encoding = TextEncoder.getEncoding(TextEncoder.DEFAULT_ENCODING);
      if (label !== undefined) {
        console.warn('TextEncoder constructor called with encoding label, which is ignored.');
      }
    }
  }

  encode(text: string, options?: object): Uint8Array {
    text = !text ? '' : text;
    options = utils.toDictionary(options);

    if (!this._notFlush) {
      this._encoder = TextEncoder.encoders[this._encoding.name]({
        fatal: this._fatal === 'fatal'
      });
    }
    this._notFlush = !!options['stream'];
    let input = new Stream(TextEncoder.stringToCodePoints(text));
    let output = [];
    let result: number | number[];
    while (true) {
      let token = input.read();
      if (token === Stream.endOfStream)
        break;
      result = this._encoder.handler(input, token);
      if (result === TextEncoder.finished) {
        break;
      }
      if (Array.isArray(result)) {
        output.push(...result);
      } else {
        output.push(result);
      }
    }
    if (!this._notFlush) {
      while (true) {
        result = this._encoder.handler(input, input.read());
        if (result === TextEncoder.finished) {
          break;
        }
        if (Array.isArray(result)) {
          output.push(...result);
        } else {
          output.push(result);
        }
      }
      this._encoder = null;
    }
    return new Uint8Array(output);
  }

}

class UTF8Encoder implements Encoder {
  constructor(public options: { fatal: boolean }) { }

  handler(stream: Stream, codePoint: number): number | number[] {
    if (codePoint === Stream.endOfStream) {
      return TextEncoder.finished;
    }
    if (utils.isASCIIByte(codePoint)) {
      return codePoint;
    }
    let count;
    let offset;
    if (utils.inRange(codePoint, 0x0080, 0x07FF)) {
      count = 1;
      offset = 0xC0;
    } else if (utils.inRange(codePoint, 0x0800, 0xFFFF)) {
      count = 2;
      offset = 0xE0;
    } else if (utils.inRange(codePoint, 0x10000, 0x10FFFF)) {
      count = 3;
      offset = 0xF0;
    }

    let bytes = [(codePoint >> (6 * count)) + offset];
    while (count > 0) {
      let temp = codePoint >> (6 * (count - 1));
      bytes.push(0x80 | (temp & 0x3F));
      count -= 1;
    }
    return bytes;
  }
}

(function initialize() {
  TextEncoder.encodings.forEach((item) => {
    item.encodings.forEach((encoding) => {
      encoding.labels.forEach((label) => {
        TextEncoder.label2encoding[label] = encoding;
      })
    })
  })
  TextEncoder.encoders['UTF-8'] = (options) => {
    return new UTF8Encoder(options);
  };
})();

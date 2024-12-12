import { Blob } from "src/common/polyfill/Blob";
import Document from 'src/common/polyfill/Document';
import EventTarget from "src/common/polyfill/EventTarget";
import FileReader from "src/common/polyfill/FileReader";
import { HTMLCanvasElement } from "src/common/polyfill/HTMLCanvasElement";
import { HTMLImageElement } from "src/common/polyfill/HTMLImageElement";
import TextDecoder from "src/common/polyfill/TextDecoder";
import { URL } from "src/common/polyfill/URL";
import { URLSearchParams } from "src/common/polyfill/URLSearchParams";
import Window from "src/common/polyfill/Window";
import utils from "src/common/utils/Utils";

interface PlatformAdapter {
  document: Document;
  window: Window;
  performance;
}

const document = {
  readyState: 'complete',
  visibilityState: 'visible',
  hidden: false,
  style: {},
  ontouchstart: null,
  ontouchmove: null,
  ontouchend: null,
} as Document;

const old = Object.getPrototypeOf(document);
Object.setPrototypeOf(document, {});
const proto = Object.getPrototypeOf(document);
Object.setPrototypeOf(proto, old);
utils.cloneProperty(Object.getPrototypeOf(document), EventTarget.prototype);

const window = {
  document: document,
  FileReader: FileReader,
  HTMLImageElement: HTMLImageElement,
  HTMLCanvasElement: HTMLCanvasElement,
  Blob: Blob,
  URL: URL,
  URLSearchParams: URLSearchParams,
  TextDecoder: TextDecoder,
} as Window

const platformAdapter: PlatformAdapter = {
  document: document,
  window: window,
  performance: {}
};

export default platformAdapter;

import { Blob } from "../polyfill/Blob";
import Document from '../polyfill/Document';
import EventTarget from "../polyfill/EventTarget";
import FileReader from "../polyfill/FileReader";
import { HTMLCanvasElement } from "../polyfill/HTMLCanvasElement";
import { HTMLImageElement } from "../polyfill/HTMLImageElement";
import TextDecoder from "../polyfill/TextDecoder";
import { URL } from "../polyfill/URL";
import { URLSearchParams } from "../polyfill/URLSearchParams";
import Window from "../polyfill/Window";
import utils from "../utils/Utils";

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

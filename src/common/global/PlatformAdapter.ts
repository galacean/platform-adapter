import { Blob } from "common/polyfill/Blob";
import Document from 'common/polyfill/Document';
import EventTarget from "common/polyfill/EventTarget";
import FileReader from "common/polyfill/FileReader";
import { HTMLCanvasElement } from "common/polyfill/HTMLCanvasElement";
import { HTMLImageElement } from "common/polyfill/HTMLImageElement";
import TextDecoder from "common/polyfill/TextDecoder";
import { URL } from "common/polyfill/URL";
import { URLSearchParams } from "common/polyfill/URLSearchParams";
import Window from "common/polyfill/Window";
import utils from "common/utils/Utils";

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

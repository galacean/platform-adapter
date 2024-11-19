import document from "./Document";
import { Blob } from "./Blob";
import FileReader from "./FileReader";
import HTMLElement from "./HTMLElement";
import { URL } from "./URL";
import { URLSearchParams } from "./URLSearchParams";
import { HTMLCanvasElement } from "./HTMLCanvasElement";
import { HTMLImageElement } from "./HTMLImageElement";
import Performance from "./Performance";
import Navigator from "./Navigator";
import TextDecoder from "./TextDecoder";

interface Window {
  canvas: HTMLElement,
  document,
  navigator: Navigator,
  XMLHttpRequest,
  WebSocket,
  Image,
  Audio,
  FileReader: typeof FileReader,
  HTMLElement,
  localStorage: {},
  location: {},
  Blob: typeof Blob,
  URL: typeof URL,
  URLSearchParams: typeof URLSearchParams,
  innerWidth: number,
  innerHeight: number,
  devicePixelRatio: number,
  screen: {},
  ontouchstart,
  ontouchmove,
  ontouchend,
  performance: Performance,
  HTMLImageElement: typeof HTMLImageElement,
  HTMLCanvasElement: typeof HTMLCanvasElement,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  requestAnimationFrame,
  cancelAnimationFrame,
  OffscreenCanvas,
  TextDecoder,
}

// @ts-ignore
var window: Window = {
  document: document,
  FileReader: FileReader,
  HTMLImageElement: HTMLImageElement,
  HTMLCanvasElement: HTMLCanvasElement,
  Blob: Blob,
  URL: URL,
  URLSearchParams: URLSearchParams,
  TextDecoder: TextDecoder,
};

export default window;
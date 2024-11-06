import document from "./document";
import { Blob } from "./Blob";
import FileReader from "./FileReader";
import HTMLElement from "./HTMLElement";
import { URL } from "./URL";
import { URLSearchParams } from "./URLSearchParams";
import { HTMLImageElement, HTMLCanvasElement } from "./constructor";

interface Window {
  canvas: HTMLElement,
  document,
  navigator,
  XMLHttpRequest,
  WebSocket,
  Image,
  Audio,
  FileReader,
  HTMLElement,
  localStorage,
  location,
  Blob,
  URL,
  URLSearchParams,
  innerWidth: number,
  innerHeight: number,
  devicePixelRatio: number,
  screen,
  ontouchstart,
  ontouchmove,
  ontouchend,
  performance,
  HTMLImageElement,
  HTMLCanvasElement,
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  requestAnimationFrame,
  cancelAnimationFrame,
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
};

export default window;

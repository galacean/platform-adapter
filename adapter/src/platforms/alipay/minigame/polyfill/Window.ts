import Canvas from './Canvas';

import navigator from './Navigator';
import XMLHttpRequest from './XMLHttpRequest';
import WebSocket from './WebSocket';
import Image from './Image';
import Audio from './Audio';
import HTMLElement from './HTMLElement';
import OffscreenCanvas from './OffscreenCanvas';
import './Performance';

import platformAdapter from '../../../../common/global/PlatformAdapter';
import { devicePixelRatio, innerWidth, innerHeight, performance } from './WindowProperties';

Object.assign(platformAdapter.window, {
  canvas: Canvas(),
  navigator: navigator,
  XMLHttpRequest: XMLHttpRequest,
  WebSocket: WebSocket,
  Image: Image,
  Audio: Audio,
  HTMLElement: HTMLElement,
  localStorage: {
    get length() {
      const { keys } = my.getStorageInfoSync()
      return keys.length;
    },
  
    key(n) {
      const { keys } = my.getStorageInfoSync();
      return keys[n];
    },
  
    getItem(key) {
      return my.getStorageSync(key);
    },
  
    setItem(key, value) {
      return my.setStorageSync(key, value);
    },
  
    removeItem(key) {
      my.removeStorageSync(key);
    },
  
    clear() {
      my.clearStorageSync();
    }
  },
  location: {
    href: 'game.js',
    hostname: 'alipay.com',
    reload() { }
  },
  OffscreenCanvas: OffscreenCanvas,
  innerWidth: innerWidth,
  innerHeight: innerHeight,
  devicePixelRatio: devicePixelRatio,
  screen: {
    availWidth: innerWidth,
    availHeight: innerHeight
  },
  ontouchstart: null,
  ontouchmove: null,
  ontouchend: null,
  performance: performance,
  setTimeout: globalThis.setTimeout,
  setInterval: globalThis.setInterval,
  clearTimeout: globalThis.clearTimeout,
  clearInterval: globalThis.clearInterval,
  requestAnimationFrame: globalThis.requestAnimationFrame,
  cancelAnimationFrame: globalThis.cancelAnimationFrame
});

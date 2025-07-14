import navigator from './Navigator';
import XMLHttpRequest from './XMLHttpRequest';
import WebSocket from './WebSocket';
import Image from './Image';
import Audio from './Audio';
import AudioContext from './AudioContext';
import HTMLElement from './HTMLElement';
import OffscreenCanvas from './OffscreenCanvas';
import './Performance';

import platformAdapter from '../../../../common/global/PlatformAdapter';
import { devicePixelRatio, innerWidth, innerHeight, performance } from './WindowProperties';

Object.assign(platformAdapter.window, {
  navigator: navigator,
  XMLHttpRequest: XMLHttpRequest,
  WebSocket: WebSocket,
  Image: () => { return Image(platformAdapter.window.canvas) },
  Audio: Audio,
  AudioContext: AudioContext,
  HTMLElement: HTMLElement,
  localStorage: {
    get length() {
      const { keys } = wx.getStorageInfoSync();
      return keys.length;
    },
  
    key(n) {
      const { keys } = wx.getStorageInfoSync();
      return keys[n];
    },
  
    getItem(key) {
      return wx.getStorageSync(key);
    },
  
    setItem(key, value) {
      return wx.setStorageSync(key, value);
    },
  
    removeItem(key) {
      wx.removeStorageSync(key);
    },
  
    clear() {
      wx.clearStorageSync();
    }
  },
  location: {
    href: 'game.js',
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

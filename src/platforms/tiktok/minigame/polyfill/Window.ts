import Canvas from './Canvas';

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
  canvas: Canvas(),
  navigator: navigator,
  XMLHttpRequest: XMLHttpRequest,
  WebSocket: WebSocket,
  Image: Image,
  Audio: Audio,
  AudioContext: AudioContext,
  HTMLElement: HTMLElement,
  localStorage: {
    get length() {
      const { keys } = tt.getStorageInfoSync();
      return keys.length;
    },
  
    key(n) {
      const { keys } = tt.getStorageInfoSync();
      return keys[n];
    },
  
    getItem(key) {
      return tt.getStorageSync(key);
    },
  
    setItem(key, value) {
      return tt.setStorageSync(key, value);
    },
  
    removeItem(key) {
      tt.removeStorageSync(key);
    },
  
    clear() {
      tt.clearStorageSync();
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
  setTimeout: GameGlobal.setTimeout,
  setInterval: GameGlobal.setInterval,
  clearTimeout: GameGlobal.clearTimeout,
  clearInterval: GameGlobal.clearInterval,
  requestAnimationFrame: GameGlobal.requestAnimationFrame,
  cancelAnimationFrame: GameGlobal.cancelAnimationFrame
});

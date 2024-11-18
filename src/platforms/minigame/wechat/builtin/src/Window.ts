import Canvas from './Canvas';

import navigator from './Navigator';
import XMLHttpRequest from './XMLHttpRequest';
import WebSocket from './WebSocket';
import Image from './Image';
import Audio from './Audio';
import HTMLElement from './HTMLElement';
import OffscreenCanvas from './OffscreenCanvas';

import window from 'common/web/Window';
import { devicePixelRatio, innerWidth, innerHeight, performance } from './WindowProperties';

window.canvas = Canvas();
window.navigator = navigator;
window.XMLHttpRequest = XMLHttpRequest;
window.WebSocket = WebSocket;
window.Image = Image;
window.Audio = Audio;
window.HTMLElement = HTMLElement;

window.localStorage = {
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
};

window.location = {
  href: 'game.js',
  reload() { }
};

window.OffscreenCanvas = OffscreenCanvas;

window.innerWidth = innerWidth;
window.innerHeight = innerHeight;
window.devicePixelRatio = devicePixelRatio;
window.screen = {
  availWidth: innerWidth,
  availHeight: innerHeight,
};
window.ontouchstart = null;
window.ontouchmove = null;
window.ontouchend = null;

window.performance = performance;

const {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  requestAnimationFrame,
  cancelAnimationFrame,
} = GameGlobal;

window.setTimeout = setTimeout;
window.setInterval = setInterval;
window.clearTimeout = clearTimeout;
window.clearInterval = clearInterval;
window.requestAnimationFrame = requestAnimationFrame;
window.cancelAnimationFrame = cancelAnimationFrame;

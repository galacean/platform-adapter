import Canvas from './Canvas';

import navigator from './navigator';
import XMLHttpRequest from './XMLHttpRequest';
import WebSocket from './WebSocket';
import Image from './Image';
import Audio from './Audio';
import HTMLElement from './HTMLElement';
import localStorage from './localStorage';
import location from './location';

import window from 'common/web/window';
import performance from './performance';

window.canvas = Canvas();
window.navigator = navigator;
window.XMLHttpRequest = XMLHttpRequest;
window.WebSocket = WebSocket;
window.Image = Image;
window.Audio = Audio;
window.HTMLElement = HTMLElement;
window.localStorage = localStorage;
window.location = location;

const { screenWidth, screenHeight, devicePixelRatio } = wx.getSystemInfoSync()

window.innerWidth = screenWidth;
window.innerHeight = screenHeight;
window.devicePixelRatio = devicePixelRatio;
window.screen = {
  availWidth: screenWidth,
  availHeight: screenHeight
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

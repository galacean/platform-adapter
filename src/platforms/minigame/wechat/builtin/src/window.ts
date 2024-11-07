import Canvas from './Canvas';

import navigator from './navigator';
import XMLHttpRequest from './XMLHttpRequest';
import WebSocket from './WebSocket';
import Image from './Image';
import Audio from './Audio';
import HTMLElement from './HTMLElement';
import localStorage from './localStorage';
import location from './location';
import OffscreenCanvas from './OffscreenCanvas';

import window from 'common/web/window';
import { devicePixelRatio, innerWidth, innerHeight, performance } from './WindowProperties';

window.canvas = Canvas();
window.navigator = navigator;
window.XMLHttpRequest = XMLHttpRequest;
window.WebSocket = WebSocket;
window.Image = Image;
window.Audio = Audio;
window.HTMLElement = HTMLElement;
window.localStorage = localStorage;
window.location = location;
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

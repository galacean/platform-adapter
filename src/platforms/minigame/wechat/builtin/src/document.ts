import * as window from './window';
import $HTMLElement from './HTMLElement';
import Image from './Image';
import Audio from './Audio';
import Canvas from './Canvas';
import './EventIniter/';

import utils from '../../utils/utils';
import EventTarget from '../../../../../common/web/EventTarget';

const document = {
  readyState: 'complete',
  visibilityState: 'visible',
  documentElement: window,
  hidden: false,
  style: {},
  location: window.location,
  ontouchstart: null,
  ontouchmove: null,
  ontouchend: null,

  head: new $HTMLElement('head'),
  body: new $HTMLElement('body'),

  createElement(tagName) {
    if (tagName === 'canvas') {
      return Canvas();
    } else if (tagName === 'audio') {
      return new Audio();
    } else if (tagName === 'img') {
      return Image();
    }

    return new $HTMLElement(tagName)
  },

  getElementById(id) {
    if (id === window.canvas.id) {
      return window.canvas;
    }
    return null;
  },

  getElementsByTagName(tagName) {
    if (tagName === 'head') {
      return [document.head];
    } else if (tagName === 'body') {
      return [document.body];
    } else if (tagName === 'canvas') {
      return [window.canvas];
    }
    return [];
  },

  getElementsByName(tagName) {
    if (tagName === 'head') {
      return [document.head];
    } else if (tagName === 'body') {
      return [document.body];
    } else if (tagName === 'canvas') {
      return [window.canvas];
    }
    return [];
  },

  querySelector(query) {
    if (query === 'head') {
      return document.head;
    } else if (query === 'body') {
      return document.body;
    } else if (query === 'canvas') {
      return window.canvas;
    } else if (query === `#${window.canvas.id}`) {
      return window.canvas;
    }
    return null;
  },

  querySelectorAll(query) {
    if (query === 'head') {
      return [document.head];
    } else if (query === 'body') {
      return [document.body];
    } else if (query === 'canvas') {
      return [window.canvas];
    }
    return [];
  },
}

const old = document.__proto__;
document.__proto__ = {};
document.__proto__.__proto__ = old;
utils.cloneProperty(document.__proto__, EventTarget.prototype);

export default document;

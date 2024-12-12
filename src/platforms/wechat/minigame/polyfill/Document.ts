import platformAdapter from 'src/common/global/PlatformAdapter';
import $HTMLElement from './HTMLElement';
import Image from './Image';
import Audio from './Audio';
import Canvas from './Canvas';
import './events';

Object.assign(platformAdapter.document, {
  documentElement: platformAdapter.window,
  location: platformAdapter.window.location,
  head: new $HTMLElement('head'),
  body: new $HTMLElement('body'),
  createElement: (tagName) => {
    if (tagName === 'canvas') {
      return Canvas();
    } else if (tagName === 'audio') {
      return new Audio();
    } else if (tagName === 'img') {
      return Image();
    }
  
    return new $HTMLElement(tagName);
  },
  getElementById: (id) => {
    // @ts-ignore
    if (id === platformAdapter.window.canvas.id) {
      return platformAdapter.window.canvas;
    }
    return null;
  },
  getElementsByTagName: (tagName) => {
    if (tagName === 'head') {
      return [platformAdapter.document.head];
    } else if (tagName === 'body') {
      return [platformAdapter.document.body];
    } else if (tagName === 'canvas') {
      return [platformAdapter.window.canvas];
    }
    return [];
  },
  querySelector: (query) => {
    if (query === 'head') {
      return platformAdapter.document.head;
    } else if (query === 'body') {
      return platformAdapter.document.body;
    } else if (query === 'canvas') {
      return platformAdapter.window.canvas;
    // @ts-ignore
    } else if (query === `#${platformAdapter.window.canvas.id}`) {
      return platformAdapter.window.canvas;
    }
    return null;
  },
  querySelectorAll: (query) => {
    if (query === 'head') {
      return [platformAdapter.document.head];
    } else if (query === 'body') {
      return [platformAdapter.document.body];
    } else if (query === 'canvas') {
      return [platformAdapter.window.canvas];
    }
    return [];
  },
});

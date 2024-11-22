import document from 'common/polyfill/Document';
import window from 'common/polyfill/Window';
import $HTMLElement from './HTMLElement';
import Image from './Image';
import Audio from './Audio';
import Canvas from './Canvas';
import './events';

document.documentElement = window;
document.location = window.location;

document.head = new $HTMLElement('head');
document.body = new $HTMLElement('body');

document.createElement = (tagName) => {
  if (tagName === 'canvas') {
    return Canvas();
  } else if (tagName === 'audio') {
    return new Audio();
  } else if (tagName === 'img') {
    return Image();
  }

  return new $HTMLElement(tagName);
};

document.getElementById = (id) => {
  if (id === window.canvas.id) {
    return window.canvas;
  }
  return null;
};

document.getElementsByTagName = (tagName) => {
  if (tagName === 'head') {
    return [document.head];
  } else if (tagName === 'body') {
    return [document.body];
  } else if (tagName === 'canvas') {
    return [window.canvas];
  }
  return [];
};

document.getElementsByName = (tagName) => {
  if (tagName === 'head') {
    return [document.head];
  } else if (tagName === 'body') {
    return [document.body];
  } else if (tagName === 'canvas') {
    return [window.canvas];
  }
  return [];
};

document.querySelector = (query) => {
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
};

document.querySelectorAll = (query) => {
  if (query === 'head') {
    return [document.head];
  } else if (query === 'body') {
    return [document.body];
  } else if (query === 'canvas') {
    return [window.canvas];
  }
  return [];
};

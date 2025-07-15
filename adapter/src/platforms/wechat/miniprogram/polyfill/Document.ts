import platformAdapter from '../../../../common/global/PlatformAdapter';
import $HTMLElement from './HTMLElement';
import Image from './Image';
import Audio from './Audio';
import { touchEventHandlerFactory } from './events';
import Event from '../../../../common/polyfill/Event';

Object.assign(platformAdapter.document, {
  documentElement: platformAdapter.window,
  location: platformAdapter.window.location,
  head: new $HTMLElement('head'),
  body: new $HTMLElement('body'),
  createElement: (tagName) => {
    if (tagName === 'canvas') {
      return platformAdapter.window.canvas;
    } else if (tagName === 'audio') {
      return new Audio();
    } else if (tagName === 'img') {
      return Image(platformAdapter.window.canvas);
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
  onvisibilitychange(visible: boolean) {
    return () => {
      this.visibilityState = visible ? 'visible' : 'hidden';
      const hidden = !visible;
      if (this.hidden === hidden) {
        return;
      }
      this.hidden = hidden;
      const event = new Event('visibilitychange');
      event.target = this;
      event.timestampe = Date.now();
      this.dispatchEvent(event);
    }
  },
  dispatchTouchEvent(event: any) {
    touchEventHandlerFactory('pointerdown')(event);
    touchEventHandlerFactory('pointermove')(event);
    touchEventHandlerFactory('pointerup')(event);
    touchEventHandlerFactory('pointercancel')(event);
    touchEventHandlerFactory('pointerleave')(event);
  }
});


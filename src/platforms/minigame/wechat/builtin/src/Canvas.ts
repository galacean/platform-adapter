import { innerWidth, innerHeight } from './WindowProperties';
import $HTMLElement from './HTMLElement'
import EventTarget from 'common/web/EventTarget';

import utils from 'utils/utils';

let hasModifiedCanvasPrototype = false
let hasInit2DContextConstructor = false
let hasInitWebGLContextConstructor = false

export default function Canvas() {
  const canvas = wx.createCanvas();

  canvas.type = 'canvas';

  canvas.__proto__.__proto__ = new $HTMLElement('canvas');

  const _getContext = canvas.getContext;

  canvas.getBoundingClientRect = () => {
    const ret = {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    return ret;
  };

  Object.defineProperty(canvas, 'style', {
    get() {
      return {
        top: '0px',
        left: '0px',
        width: `${innerWidth}px`,
        height: `${innerHeight}px`
      };
    }
  });

  Object.defineProperty(canvas, 'clientWidth', {
    get() {
      return innerWidth;
    }
  });

  Object.defineProperty(canvas, 'clientHeight', {
    get() {
      return innerHeight;
    }
  });

  // Copy prototype from EventTarget to canvas
  const old = canvas.__proto__;
  canvas.__proto__ = {};
  canvas.__proto__.__proto__ = old;
  utils.cloneProperty(canvas.__proto__, EventTarget.prototype);

  return canvas;
}

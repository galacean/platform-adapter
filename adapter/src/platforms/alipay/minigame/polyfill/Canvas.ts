import { innerWidth, innerHeight } from './WindowProperties';
import EventTarget from '../../../../common/polyfill/EventTarget';
import utils from '../../../../common/utils/Utils';
import { HTMLCanvasElement } from '../../../../common/polyfill/HTMLCanvasElement';

export default function Canvas() {
  const canvas = my.createCanvas();
  canvas.type = 'canvas';
  canvas.__proto__.__proto__ = new HTMLCanvasElement();
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;

  canvas.getBoundingClientRect = () => {
    return {
      top: 0,
      left: 0,
      width: innerWidth,
      height: innerHeight
    };
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
  const old = Object.getPrototypeOf(canvas);
  Object.setPrototypeOf(canvas, {});
  const newProto = Object.getPrototypeOf(canvas);
  Object.setPrototypeOf(newProto, old);
  utils.cloneProperty(Object.getPrototypeOf(canvas), EventTarget.prototype);

  return canvas;
}

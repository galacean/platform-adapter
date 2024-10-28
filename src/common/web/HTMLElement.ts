import Element from './Element'
import { noop } from './utils/noop'

export default class HTMLElement extends Element {
  className = '';
  childern = [];
  style = { };
  tagName;

  insertBefore = noop;

  innerHTML = '';

  constructor(tagName = '', innerWidth = 1, innerHeight = 1) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name, value) {
    this[name] = value;
  }

  getAttribute(name) {
    return this[name];
  }

  get clientWidth() {
    const ret = parseInt(this.style.fontSize, 10) * this.innerHTML.length;

    return Number.isNaN(ret) ? 0 : ret;
  }

  get clientHeight() {
    const ret = parseInt(this.style.fontSize, 10);

    return Number.isNaN(ret) ? 0 : ret;
  }

  getBoundingClientRect() {
    return {
      top: 0,
      left: 0,
      width: innerWidth,
      height: innerHeight
    };
  }

  focus() {
    
  }
}

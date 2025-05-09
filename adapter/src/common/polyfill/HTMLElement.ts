import Element from './Element'
import { noop } from './utils/Noop'

export default class HTMLElement extends Element {
  className: string = '';
  childern: Array<HTMLElement> = [];
  style = { };
  tagName: string;

  insertBefore = noop;

  innerHTML = '';

  constructor(tagName: string = '') {
    super();
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string) {
    this[name] = value;
  }

  getAttribute(name: string) {
    return this[name];
  }

  get clientWidth() {
    // @ts-ignore
    const ret = parseInt(this.style.fontSize, 10) * this.innerHTML.length;

    return Number.isNaN(ret) ? 0 : ret;
  }

  get clientHeight() {
    // @ts-ignore
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

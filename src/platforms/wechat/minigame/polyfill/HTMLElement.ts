import HTMLElement from 'src/common/polyfill/HTMLElement';
import { innerWidth, innerHeight } from './WindowProperties';

export default class $HTMLElement extends HTMLElement {
  constructor(tagName: string = '') {
    super(tagName);
    // @ts-ignore
    this.style.width = `${innerWidth}px`;
    // @ts-ignore
    this.style.height = `${innerHeight}px`;
  }
}
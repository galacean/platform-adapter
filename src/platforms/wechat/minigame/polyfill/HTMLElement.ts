import HTMLElement from 'common/polyfill/HTMLElement';
import { innerWidth, innerHeight } from './WindowProperties';

export default class $HTMLElement extends HTMLElement {
  constructor(tagName: string = '') {
    super(tagName);
    this.style.width = `${innerWidth}px`;
    this.style.height = `${innerHeight}px`;
  }
}
import HTMLElement from 'common/web/HTMLElement';
import { innerWidth, innerHeight } from './WindowProperties';

export default class $HTMLElement extends HTMLElement {
  constructor(tagName = '') {
    super(tagName);
    this.style.width = `${innerWidth}px`;
    this.style.height = `${innerHeight}px`;
  }
}
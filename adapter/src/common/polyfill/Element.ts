import Node from './Node';

export default class Element extends Node {
  className: string = '';
  children: Array<Element> = [];

  constructor() {
    super();
  }
}

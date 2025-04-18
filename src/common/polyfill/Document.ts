import HTMLElement from "./HTMLElement";
import Event from "./Event";
import TouchEvent from "./events/TouchEvent";

export default interface Document {
  [key: string]: any,
  readyState: string,
  visibilityState: string,
  onvisibilitychange: ((this, visible) => any) | null,
  documentElement: object,
  hidden: boolean,
  style: {},
  location: {},
  ontouchstart,
  ontouchmove,
  ontouchend,

  head: object,
  body: object,

  createElement(tagName: string): HTMLElement,
  getElementById(id: string): HTMLElement | null | undefined,
  getElementsByTagName(tagName: string): Array<any>,
  getElementsByName(tagName: string): Array<any>,
  querySelector(query: string): any,
  querySelectorAll(query: string): Array<any>,
  dispatchEvent(event: Event | TouchEvent): void,
}

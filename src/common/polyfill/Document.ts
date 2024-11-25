import utils from "common/utils/Utils";
import EventTarget from "./EventTarget";
import HTMLElement from "./HTMLElement";
import Event from "./Event";
import TouchEvent from "./events/TouchEvent";

interface Document {
  readyState: string,
  visibilityState: string,
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

// @ts-ignore
let document: Document = {
  readyState: 'complete',
  visibilityState: 'visible',
  hidden: false,
  style: {},
  ontouchstart: null,
  ontouchmove: null,
  ontouchend: null,
};

const old = document.__proto__;
document.__proto__ = {};
document.__proto__.__proto__ = old;
utils.cloneProperty(document.__proto__, EventTarget.prototype);

export default document;

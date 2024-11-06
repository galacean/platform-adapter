import utils from "utils/utils";
import EventTarget from "./EventTarget";

interface Document {
  readyState,
  visibilityState,
  documentElement: object,
  hidden: boolean,
  style: {},
  location: object,
  ontouchstart: null,
  ontouchmove: null,
  ontouchend: null,

  head: object,
  body: object,

  createElement(tagName),
  getElementById(id),
  getElementsByTagName(tagName),
  getElementsByName(tagName),
  querySelector(query),
  querySelectorAll(query),
  dispatchEvent(event),
}

// @ts-ignore
var document: Document = {
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

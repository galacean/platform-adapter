import { noop } from "../utils/noop";

export default class PointerEvent {
  cancelBubble: boolean;
  cancelable: boolean;
  target;
  currentTarget;
  preventDefault = noop;
  stopPropagation = noop;
  type;
  timeStamp;

  buttons: number;
  which: number;
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  pointerId: number;
  bubbles: boolean;
  pressure: number;
  pointerType;

  constructor(type) {
    this.type = type;
  }
}

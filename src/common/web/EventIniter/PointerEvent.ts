import Event from "../Event";
import { noop } from "../utils/noop";

export default class PointerEvent extends Event {
  target = null;
  currentTarget = null;
  preventDefault = noop;
  stopPropagation = noop;
  timeStamp: number;

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
  pointerType: string;
}

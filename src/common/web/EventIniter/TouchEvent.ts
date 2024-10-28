import { noop } from '../utils/noop';

export default class TouchEvent {
  target;
  currentTarget;
  touches = [];
  targetTouches = [];
  changedTouches = [];
  preventDefault = noop;
  stopPropagation = noop;
  type;
  timeStamp;

  constructor(type) {
    this.type = type
  }
}

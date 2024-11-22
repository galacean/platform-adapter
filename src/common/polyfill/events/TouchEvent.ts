import { noop } from '../utils/Noop';

export default class TouchEvent {
  target = null;
  currentTarget = null;
  touches = [];
  targetTouches = [];
  changedTouches = [];
  preventDefault = noop;
  stopPropagation = noop;
  type: string;
  timeStamp: number;

  constructor(type) {
    this.type = type;
  }
}

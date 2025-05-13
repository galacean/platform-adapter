import { noop } from '../utils/Noop';

export default class TouchEvent {
  target = null;
  currentTarget = null;
  touches = [];
  targetTouches = [];
  changedTouches = [];
  preventDefault = noop;
  stopPropagation = noop;
  timeStamp: number;

  constructor(public type: string) { }
}

import { noop } from './utils/Noop';

export default class Event {
  cancelBubble: boolean = false;
  cancelable: boolean = false;
  target = null;
  timestampe: number = Date.now();
  preventDefault = noop;
  stopPropagation = noop;

  constructor(public type: string) { }
}

import {noop} from './utils/noop';

export default class Event {
  cancelBubble: boolean = false;
  cancelable: boolean = false;
  target = null;
  timestampe: number = Date.now();
  preventDefault = noop;
  stopPropagation = noop;
  type: string;

  constructor(type: string) {
    this.type = type;
  }
}

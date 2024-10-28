import {noop} from './utils/noop';

export default class Event {
  cancelBubble = false;
  cancelable = false;
  target = null;
  timestampe = Date.now();
  preventDefault = noop;
  stopPropagation = noop;
  type;

  constructor(type) {
    this.type = type;
  }
}

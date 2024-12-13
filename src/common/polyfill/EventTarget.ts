class EventTarget {
  protected static readonly _events = new WeakMap();

  constructor() {
    EventTarget._events.set(this, {});
  }

  addEventListener(type: string, listener: any, options = {}) {
    let events = EventTarget._events.get(this);

    if (!events) {
      events = {};
      EventTarget._events.set(this, events);
    }
    if (!events[type]) {
      events[type] = [];
    }
    events[type].push(listener);

    // @ts-ignore
    if (options.capture) {
      console.warn('EventTarget.addEventListener: options.capture is not implemented.');
    }
    // @ts-ignore
    if (options.once) {
      console.warn('EventTarget.addEventListener: options.once is not implemented.');
    }
    // @ts-ignore
    if (options.passive) {
      console.warn('EventTarget.addEventListener: options.passive is not implemented.');
    }
  }

  removeEventListener(type: string, listener: any) {
    const listeners = EventTarget._events.get(this)[type];

    if (listeners && listeners.length > 0) {
      for (let i = listeners.length; i--; i > 0) {
        if (listeners[i] === listener) {
          listeners.splice(i, 1);
          break;
        }
      }
    }
  }

  dispatchEvent(event = {}) {
    // @ts-ignore
    const listeners = EventTarget._events.get(this)[event.type];

    if (listeners) {
      for (let i = 0; i < listeners.length; i++) {
        listeners[i](event);
      }
    }
  }
}

export default EventTarget;

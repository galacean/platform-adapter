import platformAdapter from 'common/global/PlatformAdapter';
import TouchEvent from 'common/polyfill/events/TouchEvent';

function touchEventHandlerFactory(type: string) {
  return (event) => {
    const touchEvent = new TouchEvent(type);
    const canvas = platformAdapter.window.canvas;
    touchEvent.target = canvas;
    touchEvent.currentTarget = canvas;
    touchEvent.touches = event.touches;
    touchEvent.targetTouches = Array.prototype.slice.call(event.touches);
    touchEvent.changedTouches = event.changedTouches;
    touchEvent.timeStamp = event.timeStamp;
    platformAdapter.document.dispatchEvent(touchEvent);
  }
};

wx.onTouchStart(touchEventHandlerFactory('touchstart'));
wx.onTouchMove(touchEventHandlerFactory('touchmove'));
wx.onTouchEnd(touchEventHandlerFactory('touchend'));
wx.onTouchCancel(touchEventHandlerFactory('touchcancel'));

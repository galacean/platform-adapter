import window from 'common/polyfill/Window'
import document from 'common/polyfill/Document'
import TouchEvent from 'common/polyfill/events/TouchEvent';

function touchEventHandlerFactory(type: string) {
  return (event) => {
    const touchEvent = new TouchEvent(type);
    touchEvent.target = window.canvas;
    touchEvent.currentTarget = window.canvas;
    touchEvent.touches = event.touches;
    touchEvent.targetTouches = Array.prototype.slice.call(event.touches);
    touchEvent.changedTouches = event.changedTouches;
    touchEvent.timeStamp = event.timeStamp;
    document.dispatchEvent(touchEvent);
  }
};

wx.onTouchStart(touchEventHandlerFactory('touchstart'));
wx.onTouchMove(touchEventHandlerFactory('touchmove'));
wx.onTouchEnd(touchEventHandlerFactory('touchend'));
wx.onTouchCancel(touchEventHandlerFactory('touchcancel'));

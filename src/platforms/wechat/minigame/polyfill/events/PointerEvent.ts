import platformAdapter from 'src/common/global/PlatformAdapter';
import PointerEvent from 'src/common/polyfill/events/PointerEvent';

function typeToButtons(type: string) {
  let ret = 0;
  if (type === "touchstart" || type === "touchmove" || type === "pointerdown" || type === "pointermove") {
    ret = 1;
  }
  return ret;
}

function touchEventHandlerFactory(type: string) {
  return (event) => {
    const changedTouches = event.changedTouches || event.touches;
    const canvas = platformAdapter.window.canvas;
    for (let i = 0, len = changedTouches.length; i < len; ++i) {
      const touch = changedTouches[i];
      const touchEvent = new PointerEvent(type);
      touchEvent.target = canvas;
      touchEvent.currentTarget = canvas;
      touchEvent.buttons = typeToButtons(type);
      touchEvent.which = touchEvent.buttons;
      touchEvent.pointerId = touch.identifier;
      touchEvent.pageX = touch.pageX;
      touchEvent.pageY = touch.pageY;
      touchEvent.clientX = touch.clientX;
      touchEvent.clientY = touch.clientY;
      touchEvent.offsetX = touch.pageX;
      touchEvent.offsetY = touch.pageY;
      touchEvent.pressure = touch.force;
      touchEvent.timeStamp = event.timeStamp;
      touchEvent.pointerType = 'touch';
      platformAdapter.document.dispatchEvent(touchEvent);
    }
  }
};

wx.onTouchStart(touchEventHandlerFactory('pointerdown'));
wx.onTouchMove(touchEventHandlerFactory('pointermove'));
wx.onTouchEnd(touchEventHandlerFactory('pointerup'));
wx.onTouchCancel(touchEventHandlerFactory('pointercancel'));
wx.onTouchCancel(touchEventHandlerFactory('pointerleave'));

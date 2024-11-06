import window from 'common/web/window'
import document from 'common/web/document'
import PointerEvent from 'common/web/EventIniter/PointerEvent';

function typeToButtons(type) {
  let ret = 0;
  if (type === "touchstart" || type === "touchmove" || type === "pointerdown" || type === "pointermove") {
    ret = 1;
  }
  return ret;
}

function touchEventHandlerFactory(type) {
  return (event) => {
    const changedTouches = event.changedTouches || event.touches;
    for (let i = 0, len = changedTouches.length; i < len; ++i) {
      const touch = changedTouches[i];
      const touchEvent = new PointerEvent(type);
      touchEvent.target = window.canvas;
      touchEvent.currentTarget = window.canvas;
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
      document.dispatchEvent(touchEvent);
    }
  }
};

wx.onTouchStart(touchEventHandlerFactory('pointerdown'));
wx.onTouchMove(touchEventHandlerFactory('pointermove'));
wx.onTouchEnd(touchEventHandlerFactory('pointerup'));
wx.onTouchCancel(touchEventHandlerFactory('pointercancel'));
wx.onTouchCancel(touchEventHandlerFactory('pointerleave'));

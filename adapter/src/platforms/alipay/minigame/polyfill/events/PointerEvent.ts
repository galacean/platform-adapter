import platformAdapter from '../../../../../common/global/PlatformAdapter';
import PointerEvent from '../../../../../common/polyfill/events/PointerEvent';

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

my.onTouchStart(touchEventHandlerFactory('pointerdown'));
my.onTouchMove(touchEventHandlerFactory('pointermove'));
my.onTouchEnd(touchEventHandlerFactory('pointerup'));
my.onTouchCancel(touchEventHandlerFactory('pointercancel'));
my.onTouchCancel(touchEventHandlerFactory('pointerleave'));

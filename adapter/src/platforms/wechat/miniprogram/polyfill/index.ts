import platformAdapter from '../../../../common/global/PlatformAdapter';
import Canvas from './Canvas';
import './Window';
import './Document';
import utils from '../../../../common/utils/Utils';

(function inject() {
  if (globalThis.__isAdapterInjected) {
    return;
  }
  globalThis.platformAdapter = platformAdapter;
  Object.assign(platformAdapter.window, {
    addEventListener: (type, listener) => {
      // @ts-ignore
      platformAdapter.document.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      // @ts-ignore
      platformAdapter.document.removeEventListener(type, listener);
    }
  });

  utils.cloneProperty(platformAdapter, platformAdapter.window);

  if (!globalThis.__isAdapterInjected) {
    globalThis.__isAdapterInjected = true;
  }
}());

export default function bindCanvas(canvas: any) {
  Object.assign(platformAdapter.window, {
    canvas: Canvas(canvas),
  });
  Object.assign(canvas, {
    // @ts-ignore
    addEventListener: platformAdapter.window.addEventListener,
    // @ts-ignore
    removeEventListener: platformAdapter.window.removeEventListener
  });
  Object.assign(platformAdapter, {
    requestAnimationFrame: canvas.requestAnimationFrame,
    cancelAnimationFrame: canvas.cancelAnimationFrame,
  });
}

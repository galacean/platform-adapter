import platformAdapter from 'src/common/global/PlatformAdapter';
import './Window';
import './Document';
import utils from 'src/common/utils/Utils';

declare global {
  const wx;
  const GameGlobal;
}

(function inject () {
  GameGlobal.platformAdapter = platformAdapter;
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
  Object.assign(platformAdapter.window.canvas, {
    // @ts-ignore
    addEventListener: platformAdapter.window.addEventListener,
    // @ts-ignore
    removeEventListener: platformAdapter.window.removeEventListener
  })
  utils.cloneProperty(platformAdapter, platformAdapter.window);

  if (!GameGlobal.__isAdapterInjected) {
    GameGlobal.__isAdapterInjected = true;
  }
})();

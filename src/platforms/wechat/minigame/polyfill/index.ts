import platformAdapter from 'common/global/PlatformAdapter';
import './Window';
import './Document';
import utils from 'common/utils/Utils';

declare global {
  const wx;
  const GameGlobal;
}

(function inject () {
  GameGlobal.platformAdapter = platformAdapter;
  Object.assign(platformAdapter.window, {
    addEventListener: (type, listener) => {
      platformAdapter.document.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      platformAdapter.document.removeEventListener(type, listener);
    }
  });
  Object.assign(platformAdapter.window.canvas, {
    addEventListener: platformAdapter.window.addEventListener,
    removeEventListener: platformAdapter.window.removeEventListener
  })
  utils.cloneProperty(platformAdapter, platformAdapter.window);

  if (!GameGlobal.__isAdapterInjected) {
    GameGlobal.__isAdapterInjected = true;
  }
})();

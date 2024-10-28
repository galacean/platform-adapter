import * as _window from './window'
import utils from '../../utils/utils';

declare global {
  const wx;
  const GameGlobal;
}

const global = GameGlobal.PlatformGlobal.platformAdapter;

function inject () {
  utils.cloneProperty(global.window, _window);

  const myWindow = global.window;
  myWindow.addEventListener = (type, listener) => {
    myWindow.document.addEventListener(type, listener);
  }
  myWindow.removeEventListener = (type, listener) => {
    myWindow.document.removeEventListener(type, listener);
  }

  if (myWindow.canvas) {
    myWindow.canvas.addEventListener = myWindow.addEventListener;
    myWindow.canvas.removeEventListener = myWindow.removeEventListener;
  }

  const { platform } = wx.getSystemInfoSync();

  // 开发者工具无法重定义 window
  if (platform === 'devtools') {

    utils.cloneProperty(global, myWindow);
    utils.cloneProperty(global.document, myWindow.document);

    window.parent = window;
  } else {
    for (const key in myWindow) {
      global[key] = myWindow[key];
    }
    utils.cloneProperty(global, myWindow);
    utils.cloneProperty(global.document, myWindow.document);
    global.window = myWindow;
    window = global;
    window.top = window.parent = window;
  }
}

if (!GameGlobal.__isAdapterInjected) {
  GameGlobal.__isAdapterInjected = true;
  inject();
}

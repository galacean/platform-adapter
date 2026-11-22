// Alipay mini-game. The adapter has Alipay platform API implementations
// (adapter/src/platforms/alipay/minigame/polyfill) but its builder cannot build an Alipay mini-game yet
// (builder/config/platform.json has no entry), so the runner stops before building and reports that.
// The launcher for 小程序开发者工具 is to be written, and verified, together with that build support.
const notWritten = () => {
  throw new Error("The Alipay DevTools launcher is not written: the adapter cannot build Alipay mini-games yet.");
};

export default {
  name: "alipay",
  label: "支付宝小游戏",
  api: "my",
  webGLMode: 0,
  appidEnv: "ALIPAY_APPID",
  fallbackAppId: undefined,
  attachWithoutAppId: false,
  projectFiles({ game }) {
    return { "game.json": game };
  },
  check: notWritten,
  open: notWritten,
  close: notWritten,
  preview: notWritten
};

import Navigator from '../../../../common/polyfill/Navigator';
import { noop } from '../../../../common/polyfill/utils/Noop'

// TODO 需要 wx.getSystemInfo 获取更详细信息
const { system, platform, language, version } = wx.getSystemInfoSync();

const isAndroid = platform.toLowerCase().indexOf('android') !== -1;

const uaDesc = isAndroid ? `Android; CPU ${system}` : `iPhone; CPU iPhone OS ${system} like Mac OS X`;

const navigator: Navigator = {
  language,
  appVersion: `5.0 (${uaDesc}) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1`,
  userAgent: `Mozilla/5.0 (${uaDesc}) AppleWebKit/603.1.30 (KHTML, like Gecko) Mobile/14E8301 MicroMessenger/${version} MiniGame NetType/WIFI Language/${language}`,
  onLine: true,
  // TODO 用 wx.getLocation 来封装 geolocation
  geolocation: {
    getCurrentPosition: (cb: any) => {
      if (typeof(cb) !== 'function') {
        throw new TypeError("Failed to execute 'getCurrentPosition' on 'Geolocation': 1 argument required, but only 0 present.");
      }
      // 如果没有 wx.getLocation，尝试使用 wx.getFuzzyLocation 获取模糊位置
      if (wx.getLocation) {
        wx.getLocation({
          success(res) {
            const { accuracy, latitude, longitude } = res;
            cb({
              coords: {
                accuracy,
                latitude,
                longitude
              },
              timestamp: (new Date()).valueOf()
            })
          }
        });
      } else if (wx.getFuzzyLocation) {
        wx.getFuzzyLocation({
          success(res) {
            const { latitude, longitude } = res;
            cb({
              coords: {
                latitude,
                longitude
              },
              timestamp: (new Date()).valueOf()
            })
          }
        });
      }
    },
    watchPosition: noop,
    clearWatch: noop
  }
};
navigator['platform'] = platform;
if (wx.onNetworkStatusChange) {
  wx.onNetworkStatusChange(({ isConnected }) => {
    navigator.onLine = isConnected;
  });
}

export default navigator;

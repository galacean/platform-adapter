import platformAdapter from "../../../../common/global/PlatformAdapter";
import Performance from "../../../../common/polyfill/Performance";

(function initPerformance() {
  if (wx.getPerformance) {
    const { platform } = wx.getSystemInfoSync();
    const perf = wx.getPerformance();
    const initTime = perf.now();

    if (platform === 'devtools') {
      platformAdapter.performance = perf;
    } else {
      const clientPerfAdapter: Performance = {
        now: function() {
          return (perf.now() - initTime) / 1000;
        }
      };

      platformAdapter.performance = clientPerfAdapter;
    }
  }
})();

export default platformAdapter.performance;

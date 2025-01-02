import platformAdapter from "../../../../common/global/PlatformAdapter";
import Performance from "../../../../common/polyfill/Performance";

if (wx.getPerformance) {
  const { platform } = wx.getSystemInfoSync();
  const wxPerf = wx.getPerformance();
  const initTime = wxPerf.now();

  if (platform === 'devtools') {
    platformAdapter.performance = wxPerf;
  } else {
    const clientPerfAdapter: Performance = {
      now: function() {
        return (wxPerf.now() - initTime) / 1000;
      }
    };

    platformAdapter.performance = clientPerfAdapter;
  }
}

export default platformAdapter.performance;

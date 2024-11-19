import Performance from "common/web/Performance";
import utils from "utils/utils";

let performance;
if (wx.getPerformance) {
  const { platform } = wx.getSystemInfoSync();
  const wxPerf = wx.getPerformance();
  const initTime = wxPerf.now();

  if (platform === 'devtools') {
    performance = wxPerf;
  } else {
    const clientPerfAdapter: Performance = {
      now: function() {
        return (wxPerf.now() - initTime) / 1000;
      }
    };
    utils.cloneProperty(clientPerfAdapter, wxPerf);

    performance = clientPerfAdapter;
  }
}

export default performance;
import Performance from "common/polyfill/Performance";

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

    performance = clientPerfAdapter;
  }
}

export default performance;

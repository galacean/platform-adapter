import platformAdapter from "../../../../common/global/PlatformAdapter";
import Performance from "../../../../common/polyfill/Performance";

(function initPerformance() {
  if (tt.getPerformance) {
    const perf = tt.getPerformance();
    const initTime = perf.now();

    const clientPerfAdapter: Performance = {
      now: function() {
        return (perf.now() - initTime) / 1000;
      }
    };

    platformAdapter.performance = clientPerfAdapter;
  }
})();

export default platformAdapter.performance;

import platformAdapter from "../../../../common/global/PlatformAdapter";
import Performance from "../../../../common/polyfill/Performance";

(function initPerformance() {
  const initTime = Date.now();

  const clientPerfAdapter: Performance = {
    now: function() {
      return (Date.now() - initTime) / 1000;
    }
  };

  platformAdapter.performance = clientPerfAdapter;
})();

export default platformAdapter.performance;

/// @ts-nocheck
// @adapter-target @galacean/engine
// An asset that the Editor exported into a subpackage is only available after `wx.loadSubpackage`:
// load the subpackage first, then the asset. Engine's own implementation loads the asset directly.
//
// Engine finds a load that is already running in `_loadingPromises`. `_loadMainAsset` fills that entry and
// removes it when the asset settles, whoever the entry belongs to at that time. So one entry has one owner:
// - While the subpackage loads, the entry is the promise made here. Without it, two loads of one asset both
//   pass Engine's check and create two objects, and destroying one drops the other from the cache.
// - Once the asset loads, the entry is Engine's.
// - When the platform answers at once (WeChat on Android does for a subpackage that is already loaded), there
//   is nothing to wait for: the load is Engine's own from the start, exactly as without a subpackage.
var ResourceManager = /*#__PURE__*/ (function () {
  _proto._loadSubpackageAndMainAsset = function _loadSubpackageAndMainAsset(
    loader,
    item,
    remoteAssetBaseURL,
    subpackageName
  ) {
    if (!subpackageName) {
      return this._loadMainAsset(loader, item, remoteAssetBaseURL);
    }
    var _this = this;
    var loadingPromises = this._loadingPromises;
    // The platform's answer, and what to do with an answer that arrives later.
    var answer;
    var onAnswer;
    var fail = function (reason) {
      answer = { error: new Error("load subpackage " + subpackageName + " failed: " + reason) };
      onAnswer && onAnswer();
    };
    try {
      wx.loadSubpackage({
        name: subpackageName,
        success: function () {
          answer = {};
          onAnswer && onAnswer();
        },
        fail: function (e) {
          fail(e && e.errMsg);
        }
      });
    } catch (e) {
      fail(e && e.message);
    }
    if (answer && !answer.error) {
      return this._loadMainAsset(loader, item, remoteAssetBaseURL);
    }
    // Whether `_loadMainAsset` ran: from then on Engine releases what this load registered.
    var started = false;
    var promise = new AssetPromise(function (resolve, reject, setTaskCompleteProgress, setTaskDetailProgress, onTaskCancel) {
      var canceled = false;
      var mainAsset;
      onTaskCancel(function () {
        canceled = true;
        mainAsset && mainAsset.cancel();
      });
      onAnswer = function () {
        // Canceled while the subpackage loaded: do not load the asset.
        if (canceled) {
          return;
        }
        if (answer.error) {
          reject(answer.error);
          return;
        }
        try {
          mainAsset = _this._loadMainAsset(loader, item, remoteAssetBaseURL);
          started = true;
          mainAsset.onProgress(setTaskCompleteProgress, setTaskDetailProgress).then(resolve, reject);
        } catch (e) {
          reject(e);
        }
      };
      // The platform may refuse before `loadSubpackage` returns (WeChat DevTools does for an unknown subpackage).
      answer && onAnswer();
    });
    loadingPromises[remoteAssetBaseURL] = promise;
    // A load that failed or was canceled before the asset started must leave nothing behind: a registered entry
    // would answer every later load with this failure, and Engine releases the callbacks of sub-asset requests
    // (`url?q=…`) only in `_loadMainAsset`. This handler runs after the entry above is set, also when the
    // platform refused at once.
    promise.then(undefined, function () {
      if (!started) {
        _this._releaseSubAssetPromiseCallback(remoteAssetBaseURL);
      }
      if (loadingPromises[remoteAssetBaseURL] === promise) {
        delete loadingPromises[remoteAssetBaseURL];
      }
    });
    return promise;
  };
})();

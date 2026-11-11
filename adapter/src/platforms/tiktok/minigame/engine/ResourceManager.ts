/// @ts-nocheck
// @adapter-target @galacean/engine
// An asset that the Editor exported into a subpackage is only available after `tt.loadSubpackage`:
// load the subpackage first, then the asset. Engine's own implementation loads the asset directly.
//
// Engine finds a load that is already running in `_loadingPromises`, which `_loadMainAsset` fills. The
// subpackage is loaded before that, so the load is registered here first. Without it, two loads of one asset
// both pass Engine's check and create two objects, and destroying one drops the other from the cache.
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
    var promise = new AssetPromise(function (resolve, reject, setTaskCompleteProgress, setTaskDetailProgress, onTaskCancel) {
      var canceled = false;
      var mainAsset;
      onTaskCancel(function () {
        canceled = true;
        // The platform may answer at once when the subpackage is already loaded (WeChat on Android does):
        // the asset is then loading already, and has to be canceled too.
        mainAsset && mainAsset.cancel();
      });
      tt.loadSubpackage({
        name: subpackageName,
        success: function () {
          // Canceled while the subpackage loaded: do not load the asset.
          if (canceled) {
            return;
          }
          try {
            // `_loadMainAsset` takes over the `_loadingPromises` entry and removes it when the asset has loaded.
            mainAsset = _this._loadMainAsset(loader, item, remoteAssetBaseURL);
            mainAsset.onProgress(setTaskCompleteProgress, setTaskDetailProgress).then(resolve, reject);
          } catch (e) {
            reject(e);
          }
        },
        fail: function (e) {
          reject(new Error("load subpackage " + subpackageName + " failed: " + (e && e.errMsg)));
        }
      });
    });
    loadingPromises[remoteAssetBaseURL] = promise;
    // A failed or canceled load must not stay registered, or every later load of the asset gets that failure.
    // The platform may call `fail` before `loadSubpackage` returns; this handler still runs after the line above.
    promise.then(undefined, function () {
      if (loadingPromises[remoteAssetBaseURL] === promise) {
        delete loadingPromises[remoteAssetBaseURL];
      }
    });
    return promise;
  };
})();

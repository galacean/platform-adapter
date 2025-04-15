/// @ts-nocheck

/**
 * ResourceManager
 */ var ResourceManager = /*#__PURE__*/ (function () {
  _proto._loadSubpackageAndMainAsset = function _loadSubpackageAndMainAsset(
    loader,
    item,
    remoteAssetBaseURL,
    assetBaseURL,
    subpackageName
  ) {
    if (subpackageName) {
      var _this = this;
      return new AssetPromise(function (resolve, reject) {
        wx.loadSubpackage({
          name: subpackageName,
          success: () => {
            resolve(
              _this._loadMainAsset(
                loader,
                item,
                remoteAssetBaseURL,
                assetBaseURL
              )
            );
          },
          fail: () => {
            reject(new Error("load subpackage " + subpackageName + " failed"));
          },
        });
      });
    } else {
      return this._loadMainAsset(
        loader,
        item,
        remoteAssetBaseURL,
        assetBaseURL
      );
    }
  };
})();

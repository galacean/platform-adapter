/// @ts-nocheck

/**
 * ResourceManager
 */ var ResourceManager = /*#__PURE__*/ (function () {
  /**
   * @internal
   * @beta Just for internal editor, not recommended for developers.
   */ _proto.initSubpackages = function initSubpackages(data) {
    this._virtualPathSubpackageMap = Object.create(null);
    var _this = this;
    var subpackages = data.subpacakges;
    subpackages &&
      subpackages.forEach(function (subpackage) {
        _this._virtualPathSubpackageMap[subpackage.root] = subpackage.name;
      });
  };

  _proto._loadSubpackage = function _loadSubpackage(itemOrURL) {
    var _this = this;
    return new AssetPromise(function (resolve, reject) {
      var isString = typeof itemOrURL === "string";
      var testUrl = isString ? itemOrURL : itemOrURL.url;

      var subpackageName = null;
      if (_this._virtualPathSubpackageMap) {
        Object.keys(_this._virtualPathSubpackageMap).forEach((key) => {
          if (testUrl.startsWith(key) || testUrl.startsWith("/public" + key)) {
            subpackageName = _this._virtualPathSubpackageMap[key];
            return;
          }
        });
      }

      if (subpackageName) {
        wx.loadSubpackage({
          name: subpackageName,
          success: () => {
            resolve();
          },
          fail: () => {
            reject(new Error("load subpackage " + subpackageName + " failed"));
          },
        });
      } else {
        resolve();
      }
    });
  };
})();

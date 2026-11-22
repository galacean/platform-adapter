/// @ts-nocheck
// @adapter-target @galacean/engine
// SourceFontLoader loads a font file (.ttf/.otf/.woff) directly and, like FontLoader, registers it with
// `FontFace`, which mini-games do not have. Register it the way this platform's FontLoader override does,
// and name the Font after the family the platform returns, which Engine uses as the font family.
var SourceFontLoader = /*#__PURE__*/ function(Loader) {
  var _proto = SourceFontLoader.prototype;
  _proto.load = function load(item, resourceManager) {
    var _this = this;
    return new AssetPromise(function(resolve, reject) {
      var url = resourceManager._getRemoteUrl(item.url);
      _this._registerFont(url, url).then(function(family) {
        resolve(new Font(resourceManager.engine, family || url));
      }).catch(function(e) {
        reject("load font " + url + " fail: " + (e && e.message || e));
      });
    });
  };
  _proto._registerFont = function _registerFont(fontName, fontUrl) {
    return FontLoader.prototype._registerFont.call(this, fontName, fontUrl);
  };
}(Loader);

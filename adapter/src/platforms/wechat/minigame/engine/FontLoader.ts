/// @ts-nocheck
// @adapter-target @galacean/engine
// Engine registers font files with `new FontFace(name, url)` and `document.fonts.add`, which mini-games
// do not have. WeChat registers a font with `wx.loadFont(path)` and returns the family name it chose,
// which may differ from the asset's `fontName`. Engine renders text with `Font.name` as the font family,
// so the loaded Font is named after the family WeChat returns.
// `wx.loadFont` can return before the family is usable (DevTools: 0.1–0.2 s later; Android devices: at once).
// Text measured in that window uses a fallback font and Engine caches those glyphs, so the loader waits until
// text measures differently with the family, for at most 0.5 s. The same code runs on devices and in DevTools.
var FontLoader = /*#__PURE__*/ function(Loader) {
  var _proto = FontLoader.prototype;
  _proto.load = function load(item, resourceManager) {
    var _this = this;
    return new AssetPromise(function(resolve, reject) {
      resourceManager._request(item.url, _extends({}, item, {
        type: "json"
      })).then(function(data) {
        var fontName = data.fontName, fontUrl = data.fontUrl;
        if (fontUrl) {
          var absoluteUrl = Utils.resolveAbsoluteUrl(item.url, fontUrl);
          var remoteUrl = resourceManager._getRemoteUrl(absoluteUrl);
          _this._registerFont(fontName, remoteUrl).then(function(family) {
            resolve(new Font(resourceManager.engine, family || fontName));
          }).catch(function(e) {
            reject("load font " + fontUrl + " fail: " + (e && e.message || e));
          });
        } else {
          resolve(new Font(resourceManager.engine, fontName));
        }
      }).catch(function(e) {
        reject(e);
      });
    });
  };
  _proto._registerFont = function _registerFont(fontName, fontUrl) {
    return new Promise(function(resolve, reject) {
      var register = function(path) {
        var family = wx.loadFont(path);
        if (!family) {
          reject(new Error("wx.loadFont returned no family for " + path));
          return;
        }
        // The family is usable once text measures differently from the fallback font alone. A font without the
        // sample's characters (a subset font with only the glyphs a game uses) never does, so the wait is short.
        var context = wx.createCanvas().getContext("2d");
        var sample = "BESbswy 0123 Aa";
        var width = function(font) {
          context.font = font;
          return context.measureText(sample).width;
        };
        var started = Date.now();
        var check = function() {
          var usable = ["monospace", "serif"].some(function(fallback) {
            return width('48px "' + family + '", ' + fallback) !== width("48px " + fallback);
          });
          if (usable || Date.now() - started > 500) {
            resolve(family);
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      };
      // wx.loadFont only reads local files: download remote fonts first.
      if (/^https?:\/\//i.test(fontUrl)) {
        wx.downloadFile({
          url: fontUrl,
          success: function(res) {
            res.statusCode === 200 ? register(res.tempFilePath) : reject(new Error("download " + fontUrl + " failed: " + res.statusCode));
          },
          fail: function(e) {
            reject(new Error("download " + fontUrl + " failed: " + (e && e.errMsg)));
          }
        });
      } else {
        register(fontUrl);
      }
    });
  };
}(Loader);

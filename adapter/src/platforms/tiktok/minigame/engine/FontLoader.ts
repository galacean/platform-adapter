/// @ts-nocheck
// @adapter-target @galacean/engine
// Engine registers font files with `new FontFace(name, url)` and `document.fonts.add`, which mini-games
// do not have. Douyin registers a font with `tt.loadFont(path)` and returns a family name it generates
// (for example `tmg_font_55912652`), never the asset's `fontName`. Engine renders text with `Font.name` as
// the font family, so the loaded Font is named after the family Douyin returns.
// On Android devices and in DevTools the family is usable as soon as `tt.loadFont` returns, so the usability
// check passes at once. It is kept, for at most 0.5 s, so that text is never measured with a fallback font
// (Engine caches those glyphs). The same code runs on devices and in DevTools.
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
        var family = tt.loadFont(path);
        if (!family) {
          reject(new Error("tt.loadFont returned no family for " + path));
          return;
        }
        // The family is usable once text measures differently from the fallback font alone. A font without the
        // sample's characters (a subset font with only the glyphs a game uses) never does, so the wait is short.
        var context = tt.createCanvas().getContext("2d");
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
      // tt.loadFont only reads local files: download remote fonts first.
      if (/^https?:\/\//i.test(fontUrl)) {
        tt.downloadFile({
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

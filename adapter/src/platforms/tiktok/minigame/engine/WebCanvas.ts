/// @ts-nocheck
// @adapter-target @galacean/engine
// A mini-game canvas always fills the screen, so its display size is fixed. Engine's auto-resolution follows
// the display size with ResizeObserver, which mini-games do not have, and otherwise warns that it falls back
// to sizing once. Sizing once is the correct behavior here, so do it directly, without probing or warning.
var WebCanvas = /*#__PURE__*/ function(Canvas) {
  var _proto = WebCanvas.prototype;
  _proto.setAutoResolution = function setAutoResolution(scale) {
    if (scale === void 0) scale = 1;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error("WebCanvas.setAutoResolution: invalid scale " + scale);
    }
    this._autoResolutionScale = scale;
    this._setResolutionByClientSizeFallback(scale);
  };
}(Canvas);

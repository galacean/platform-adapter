/// @ts-nocheck
// @adapter-target @galacean/engine
// Engine 2.0 decodes audio with `new OfflineAudioContext(1, 1, 44100)`, which mini-games do not have.
// Decode with the engine's own audio context (the platform WebAudio context) instead.
var AudioLoader = /*#__PURE__*/ function(Loader) {
  AudioLoader._getDecodeContext = function _getDecodeContext() {
    return AudioManager.getContext();
  };
}(Loader);

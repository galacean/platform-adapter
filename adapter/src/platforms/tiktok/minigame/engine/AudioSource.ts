/// @ts-nocheck
// @adapter-target @galacean/engine
// Douyin's WebAudio AudioParam has no `setValueAtTime` (seen on devices: "gainNode.gain.setValueAtTime is not
// a function" on the first play). Engine sets the gain with it when it creates a source's gain node and when
// the volume changes, so both set `gain.value` instead. Everything else is Engine's implementation.
var AudioSource = /*#__PURE__*/ function (Component) {
  var _proto = AudioSource.prototype;
  _proto._ensureGainNode = function _ensureGainNode() {
    var gainNode = this._gainNode;
    if (!gainNode) {
      this._gainNode = gainNode = AudioManager.getContext().createGain();
      gainNode.connect(AudioManager.getGainNode());
      gainNode.gain.value = this._volume;
    }
    return gainNode;
  };
  _create_class$2(AudioSource, [
    {
      key: "volume",
      get: /**
       * The volume of the audio source, ranging from 0 to 1.
       * @defaultValue `1`
       */ function get() {
          return this._volume;
        },
      set: function set(value) {
        value = Math.min(Math.max(0, value), 1.0);
        this._volume = value;
        // The gain node is created on the first play.
        if (this._gainNode) {
          this._gainNode.gain.value = value;
        }
      }
    }
  ]);
}(Component);

/// @ts-nocheck
/**
 * Audio Source Component.
 */ var AudioSource = /*#__PURE__*/ function (Component) {
  _create_class$2(AudioSource, [
    {
      key: "clip",
      get: /**
       * The audio clip to play.
       */ function get() {
          return this._clip;
        },
      set: function set(value) {
        var lastClip = this._clip;
        if (lastClip !== value) {
          lastClip && lastClip._addReferCount(-1);
          value && value._addReferCount(1);
          this._clip = value;
          this.stop();
        }
      }
    },
    {
      key: "isPlaying",
      get: /**
       * Whether the clip playing right now.
       */ function get() {
          return this._isPlaying;
        }
    },
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
        this._gainNode.gain.value = value;
      }
    },
    {
      key: "playbackRate",
      get: /**
       * The playback rate of the audio source.
       * @defaultValue `1`
       */ function get() {
          return this._playbackRate;
        },
      set: function set(value) {
        this._playbackRate = value;
        if (this._isPlaying) {
          this._sourceNode.playbackRate.value = this._playbackRate;
        }
      }
    },
    {
      key: "mute",
      get: /**
       * Mutes or unmute the audio source.
       * Mute sets volume as 0, unmute restore volume.
       */ function get() {
          return this.volume === 0;
        },
      set: function set(value) {
        if (value) {
          this._lastVolume = this.volume;
          this.volume = 0;
        } else {
          this.volume = this._lastVolume;
        }
      }
    },
    {
      key: "loop",
      get: /**
       * Whether the audio clip looping.
       * @defaultValue `false`
       */ function get() {
          return this._loop;
        },
      set: function set(value) {
        if (value !== this._loop) {
          this._loop = value;
          if (this._isPlaying) {
            this._sourceNode.loop = this._loop;
          }
        }
      }
    },
    {
      key: "time",
      get: /**
       * Playback position in seconds.
       */ function get() {
          if (this._isPlaying) {
            var currentTime = AudioManager.getContext().currentTime;
            return currentTime - this._playTime;
          } else {
            return this._pausedTime > 0 ? this._pausedTime - this._playTime : 0;
          }
        }
    }
  ])
}(Component);
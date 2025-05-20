import HTMLAudioElement from '../../../../common/polyfill/HTMLAudioElement';

export default class Audio extends HTMLAudioElement {
  readyState = AudioState.HAVE_NOTHING;

  private static readonly _innerAudioContext = new WeakMap();
  private static readonly _src = new WeakMap();

  get currentTime() {
    return Audio._innerAudioContext.get(this).currentTime;
  }

  set currentTime(value) {
    Audio._innerAudioContext.get(this).seek(value);
  }

  get src() {
    return Audio._src.get(this);
  }

  set src(value) {
    Audio._src.set(this, value);
    Audio._innerAudioContext.get(this).src = value;
  }

  get loop() {
    return Audio._innerAudioContext.get(this).loop;
  }

  set loop(value) {
    Audio._innerAudioContext.get(this).loop = value;
  }

  get autoplay() {
    return Audio._innerAudioContext.get(this).autoplay;
  }

  set autoplay(value) {
    Audio._innerAudioContext.get(this).autoplay = value;
  }

  get paused() {
    return Audio._innerAudioContext.get(this).paused;
  }

  constructor(url?: string) {
    super();

    const innerAudioContext = my.createInnerAudioContext();
    Audio._innerAudioContext.set(this, innerAudioContext);
    this.src = url;

    innerAudioContext.onCanplay(() => {
      this.dispatchEvent({ type: 'load' });
      this.dispatchEvent({ type: 'loadend' });
      this.dispatchEvent({ type: 'canplay'});
      this.dispatchEvent({ type: 'canplaythrough' });
      this.dispatchEvent({ type: 'loadedmetadata' });
      this.readyState = AudioState.HAVE_CURRENT_DATA;
    })
    innerAudioContext.onPlay(() => {
      this.dispatchEvent({ type: 'play' });
    })
    innerAudioContext.onPause(() => {
      this.dispatchEvent({ type: 'pause' });
    })
    innerAudioContext.onEnded(() => {
      this.dispatchEvent({ type: 'ended' });
      this.readyState = AudioState.HAVE_ENOUGH_DATA;
    })
    innerAudioContext.onError(() => {
      this.dispatchEvent({ type: 'error' });
    })
  }

  load() {
    console.warn('HTMLAudioElement.load() is not implemented.');
  }

  play() {
    Audio._innerAudioContext.get(this).play();
  }

  pause() {
    Audio._innerAudioContext.get(this).pause();
  }

  canPlayType(mediaType = '') {
    if (typeof mediaType !== 'string') {
      return '';
    }

    if (mediaType.indexOf('audio/mpeg') > -1 || mediaType.indexOf('audio/mp4')) {
      return 'probably';
    }
    return '';
  }

  cloneNode() {
    const newAudio = new Audio();
    newAudio.loop = Audio._innerAudioContext.get(this).loop;
    newAudio.autoplay = Audio._innerAudioContext.get(this).autoplay;
    newAudio.src = this.src;
    return newAudio;
  }
}

export enum AudioState {
  HAVE_NOTHING = 0,
  HAVE_METADATA = 1,
  HAVE_CURRENT_DATA = 2,
  HAVE_FUTURE_DATA = 3,
  HAVE_ENOUGH_DATA = 4
};

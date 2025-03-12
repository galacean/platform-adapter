export default function AudioContext() {
  const audioContext = wx.createWebAudioContext();

  const _decodeAudioData = audioContext.decodeAudioData.bind(audioContext);
  Object.assign(audioContext, {
    decodeAudioData: function (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        _decodeAudioData(arrayBuffer, resolve, reject);
      });
    }
  });

  return audioContext;
}

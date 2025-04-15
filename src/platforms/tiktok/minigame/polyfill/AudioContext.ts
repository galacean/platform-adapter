export default function AudioContext() {
  const audioContext = tt.getAudioContext();

  Object.assign(audioContext, {
    resume: function (): Promise<void> {
      return new Promise((resolve, reject) => {
        audioContext.onStateChange((res) => {
          if (res.state === 'running') {
            resolve();
          }
        });
      });
    }
  });

  return audioContext;
}

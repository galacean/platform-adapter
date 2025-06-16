export default function AudioContext() {
  const audioContext = tt.getAudioContext();

  // The following block will assign losing properties to audioContext.
  const { platform } = tt.getSystemInfoSync();
  if (platform !== 'devtools') {
    audioContext.state = 'running';
    Object.assign(audioContext, {
      close: function () {
        audioContext.state = 'closed';
      },
      onStateChange: function (callback: (res: { state: string }) => void) {
        callback({ state: audioContext.state });
      },
      resume: function (): Promise<void> {
        return new Promise((resolve, reject) => {
          audioContext.onStateChange((res) => {
            if (res.state === 'running') {
              resolve();
            }
          });
        });
      },
      suspend: function () {
        audioContext.state = 'suspended';
      },
    });
  }

  return audioContext;
}

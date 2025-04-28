export default function Image() {
  const image = wx.createImage();

  Object.assign(image, {
    addEventListener(event: string, cb: () => {}) {
      image[`on${event}`] = cb.bind(image);
    },
    removeEventListener(event: string) {
      image[`on${event}`] = null;
    },
  });

  return image;
}

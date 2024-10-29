export default function Image() {
  const image = wx.createImage()

  Object.assign(image, {
    addEventListener(event, cb) {
      image[`on${event}`] = cb.bind(image);
    },
    removeEventListener(event) {
      image[`on${event}`] = null;
    },
  })

  return image
}

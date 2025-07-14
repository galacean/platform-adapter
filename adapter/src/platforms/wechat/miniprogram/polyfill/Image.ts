export default function Image(canvas: any) {
  const image = canvas.createImage();

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

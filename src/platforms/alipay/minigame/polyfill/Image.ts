import { HTMLImageElement } from "../../../../common/polyfill/HTMLImageElement";

export default function Image() {
  const image = my.createImage();
  image.__proto__.__proto__ = new HTMLImageElement();

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

import Canvas from "./Canvas"

export default function OffscreenCanvas(width: number, height: number) {
  if (wx.createOffscreenCanvas === undefined) {
    return Canvas();
  } else {
    return wx.createOffscreenCanvas(width, height);
  }
}

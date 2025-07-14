export default function OffscreenCanvas(width: number, height: number) {
  return wx.createOffscreenCanvas({ width, height });
}

import { Vector2, TextUtils } from '@galacean/engine';

TextUtils._measureFontOrChar = function _measureFontOrChar(fontString: string, measureString: string, isChar: boolean) {
  const { canvas, context } = TextUtils.textContext();
  context.font = fontString;
  // Safari gets data confusion through getImageData when the canvas width is not an integer.
  // The measure text width of some special invisible characters may be 0, so make sure the width is at least 1.
  // @todo: Text layout may vary from standard and not support emoji.
  const { width: actualWidth } = context.measureText(measureString);
  // In some case (ex: " "), actualBoundingBoxRight and actualBoundingBoxLeft will be 0, so use width.
  // TODO: With testing, actualBoundingBoxLeft + actualBoundingBoxRight is the actual rendering width
  // but the space rules between characters are unclear. Using actualBoundingBoxRight + Math.abs(actualBoundingBoxLeft) is the closest to the native effect.
  const width = Math.max(1, actualWidth);
  // Make sure enough width.
  let baseline = Math.ceil(context.measureText(TextUtils._measureBaseline).width);
  let height = baseline * TextUtils._heightMultiplier;
  baseline = (TextUtils._baselineMultiplier * baseline) | 0;
  const { _extendHeight } = TextUtils;
  height += _extendHeight;
  baseline += _extendHeight * 0.5;

  canvas.width = width;
  canvas.height = height;

  context.font = fontString;
  context.fillStyle = "#000";
  context.clearRect(0, 0, width, height);
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(measureString, 0, baseline);

  const colorData = context.getImageData(0, 0, width, height).data;
  const len = colorData.length;

  let top = -1;
  let bottom = -1;
  let y;
  let ascent = 0;
  let descent = 0;
  let size = 0;

  const integerW = canvas.width;
  const integerWReciprocal = 1.0 / integerW;
  for (let i = 0; i < len; i += 4) {
    if (colorData[i + 3] !== 0) {
      const idx = i * 0.25;
      y = ~~(idx * integerWReciprocal);

      if (top === -1) {
        top = y;
      }

      if (y > bottom) {
        bottom = y;
      }
    } else {
      colorData[i] = colorData[i + 1] = colorData[i + 2] = 255;
    }
  }

  if (top !== -1 && bottom !== -1) {
    ascent = baseline - top;
    // Baseline belong to descent
    descent = bottom - baseline + 1;
    size = ascent + descent;
  }

  if (isChar) {
    let data = null;
    if (size > 0) {
      const lineIntegerW = integerW * 4;
      // gl.texSubImage2D uploading data of type Uint8ClampedArray is not supported in some devices(eg: IphoneX IOS 13.6.1).
      data = new Uint8Array(colorData.buffer, top * lineIntegerW, size * lineIntegerW);
    }
    return {
      char: measureString,
      x: 0,
      y: 0,
      w: width,
      h: size,
      offsetX: 0,
      offsetY: (ascent - descent) * 0.5,
      xAdvance: Math.round(actualWidth),
      uvs: [new Vector2(), new Vector2(), new Vector2(), new Vector2()],
      ascent,
      descent,
      index: 0,
      data
    };
  } else {
    return { ascent, descent, size };
  }
}

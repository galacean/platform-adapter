/// @ts-nocheck
// @adapter-target @galacean/engine
// Engine 2.0 TextUtils._measureFontOrChar without `actualBoundingBoxLeft/Right`:
// the WeChat canvas `measureText` only reports `width`. Everything else, including the
// Alpha8/R8 glyph data that Engine 2.0 uploads, follows Engine's implementation.
var TextUtils = function() {
  TextUtils._measureFontOrChar = function _measureFontOrChar(fontString, measureString, isChar) {
    const { canvas, context } = TextUtils.textContext();
    context.font = fontString;
    const { width: actualWidth } = context.measureText(measureString);
    // The measure text width of some special invisible characters may be 0, so make sure the width is at least 1.
    const width = Math.max(1, Math.round(actualWidth));
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
        // Extract alpha channel only for Alpha8 texture format.
        const alphaPixelCount = size * integerW;
        data = new Uint8Array(alphaPixelCount);
        let offset = top * integerW * 4 + 3;
        for (let i = 0; i < alphaPixelCount; i++, offset += 4) {
          data[i] = colorData[offset];
        }
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
}();

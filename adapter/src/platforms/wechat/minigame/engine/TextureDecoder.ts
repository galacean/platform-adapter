/// @ts-nocheck
// @adapter-target @galacean/engine
// Engine 2.0 Texture2DDecoder.decode. Engine creates the image blob without a MIME type;
// the mini-game image loader needs a data URL with one, so the blob declares it here.
var Texture2DDecoder = /*#__PURE__*/ function() {
  Texture2DDecoder.decode = function decode(engine, bufferReader, restoredTexture) {
    return new AssetPromise(function(resolve, reject) {
      bufferReader.nextStr();
      var mipmap = !!bufferReader.nextUint8();
      var filterMode = bufferReader.nextUint8();
      var anisoLevel = bufferReader.nextUint8();
      var wrapModeU = bufferReader.nextUint8();
      var wrapModeV = bufferReader.nextUint8();
      var format = bufferReader.nextUint8();
      var width = bufferReader.nextUint16();
      var height = bufferReader.nextUint16();
      var isSRGBColorSpace = !!bufferReader.nextUint8();
      var imageData = bufferReader.nextImagesData(1)[0];
      var isHDR = imageData[0] === 0x23 && imageData[1] === 0x3f;
      var textureFormat = isHDR ? TextureFormat.R16G16B16A16 : format;
      var texture = restoredTexture || new Texture2D(engine, width, height, textureFormat, mipmap, isHDR ? false : isSRGBColorSpace);
      texture.filterMode = filterMode;
      texture.anisoLevel = anisoLevel;
      texture.wrapModeU = wrapModeU;
      texture.wrapModeV = wrapModeV;
      if (isHDR) {
        var pixels = HDRDecoder.decode(imageData).pixels;
        texture.setPixelBuffer(pixels);
        mipmap && texture.generateMipmaps();
        resolve(texture);
      } else {
        var blob = new Blob([imageData], { type: "image/png" });
        var img = new Image();
        img.onload = function() {
          URL.revokeObjectURL(img.src);
          texture.setImageSource(img);
          mipmap && texture.generateMipmaps();
          resolve(texture);
        };
        img.onerror = function(e) {
          URL.revokeObjectURL(img.src);
          reject(e);
        };
        img.src = URL.createObjectURL(blob);
      }
    });
  };
}();

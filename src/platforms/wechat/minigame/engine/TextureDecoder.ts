/// @ts-nocheck
exports.Texture2DDecoder = /*#__PURE__*/ function() {
  function Texture2DDecoder() {}
  Texture2DDecoder.decode = function decode(engine, bufferReader) {
      return new Promise(function(resolve, reject) {
          var objectId = bufferReader.nextStr();
          var mipmap = !!bufferReader.nextUint8();
          var filterMode = bufferReader.nextUint8();
          var anisoLevel = bufferReader.nextUint8();
          var wrapModeU = bufferReader.nextUint8();
          var wrapModeV = bufferReader.nextUint8();
          var format = bufferReader.nextUint8();
          var width = bufferReader.nextUint16();
          var height = bufferReader.nextUint16();
          var isPixelBuffer = bufferReader.nextUint8();
          var mipCount = bufferReader.nextUint8();
          var imagesData = bufferReader.nextImagesData(mipCount);
          var texture2D = new Texture2D(engine, width, height, format, mipmap);
          texture2D.filterMode = filterMode;
          texture2D.anisoLevel = anisoLevel;
          texture2D.wrapModeU = wrapModeU;
          texture2D.wrapModeV = wrapModeV;
          if (isPixelBuffer) {
              var pixelBuffer = imagesData[0];
              texture2D.setPixelBuffer(pixelBuffer);
              if (mipmap) {
                  texture2D.generateMipmaps();
                  for(var i = 1; i < mipCount; i++){
                      var pixelBuffer1 = imagesData[i];
                      texture2D.setPixelBuffer(pixelBuffer1, i);
                  }
              }
              // @ts-ignore
              engine.resourceManager._objectPool[objectId] = texture2D;
              resolve(texture2D);
          } else {
              var blob = new window.Blob([
                  imagesData[0]
              ], { type: "image/png" });
              var img = new Image();
              img.onload = function() {
                  texture2D.setImageSource(img);
                  var completedCount = 0;
                  var onComplete = function onComplete() {
                      completedCount++;
                      if (completedCount >= mipCount) {
                          resolve(texture2D);
                      }
                  };
                  onComplete();
                  if (mipmap) {
                      var _loop = function _loop(i) {
                          var blob = new window.Blob([
                              imagesData[i]
                          ], { type: "image/png" });
                          var img = new Image();
                          img.onload = function() {
                              texture2D.setImageSource(img, i);
                              onComplete();
                          };
                          img.src = URL.createObjectURL(blob);
                      };
                      texture2D.generateMipmaps();
                      for(var i = 1; i < mipCount; i++)_loop(i);
                  }
              };
              img.src = URL.createObjectURL(blob);
          }
      });
  };
  return Texture2DDecoder;
}();
/// @ts-nocheck
/** @internal */ var BinomialLLCTranscoder = /*#__PURE__*/ function (AbstractTranscoder) {
  var _proto = BinomialLLCTranscoder.prototype;
  _proto._initTranscodeWorkerPool = function _initTranscodeWorkerPool() {
    var _this = this;
    return new Promise(function (resolve, reject) {
      init().then(function () {
        resolve(null);
      });
    });
  };
  _proto.transcode = function transcode1(buffer, format) {
    return init().then(function (KTX2File) {
      return transcode(buffer, format, KTX2File);
    });
  };
}(AbstractTranscoder);

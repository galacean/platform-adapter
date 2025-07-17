/// @ts-nocheck
exports.KTX2Loader = /*#__PURE__*/ function(Loader) {
    /** @internal */ KTX2Loader._parseBuffer = function _parseBuffer(buffer, engine, params) {
        var ktx2Container = new KTX2Container(buffer);
        var _params_priorityFormats;
        var formatPriorities = (_params_priorityFormats = params == null ? void 0 : params.priorityFormats) != null ? _params_priorityFormats : KTX2Loader._priorityFormats[ktx2Container.isUASTC ? "uastc" : "etc1s"];
        var targetFormat = KTX2Loader._decideTargetFormat(engine, ktx2Container, formatPriorities);
        var binomialLLCWorker = KTX2Loader._getBinomialLLCTranscoder();
        var transcodeResultPromise = binomialLLCWorker.init().then(function() {
            return binomialLLCWorker.transcode(buffer, targetFormat);
        });
        return transcodeResultPromise.then(function(result) {
            return {
                ktx2Container: ktx2Container,
                engine: engine,
                result: result,
                targetFormat: targetFormat,
                params: ktx2Container.keyValue["GalaceanTextureParams"]
            };
        });
    };
}(Loader);

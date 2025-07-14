/// @ts-nocheck
var _init = function init() {
  var initPromise;
  return function init(wasmBinary) {
    if (!initPromise) {
      initPromise = new Promise(function (resolve, reject) {
        var BasisModule = {
          wasmBinary: wasmBinary,
          onRuntimeInitialized: function onRuntimeInitialized() {
            console.log('Basis transcoder initialized');
            return resolve(BasisModule);
          },
          onAbort: reject
        };
        window.BASIS(BasisModule);
      }).then(function (BasisModule) {
        BasisModule.initializeBasis();
        return BasisModule.KTX2File;
      });
    }
    return initPromise;
  };
};

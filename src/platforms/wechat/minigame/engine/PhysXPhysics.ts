/// @ts-nocheck
/**
   * PhysX object creation.
   */ var PhysXPhysics = /*#__PURE__*/ function() {
  /**
   * Initialize PhysXPhysics.
   * @param runtimeMode - Runtime mode
   * @returns Promise object
   */ _proto.initialize = function initialize() {
      const initializePromise = new Promise((resolve, reject) => {
        (window).PHYSX().then((PHYSX) => {
          this._init(PHYSX);
          this._initializeState = 2;
          this._initializePromise = null;
          console.log("PhysX loaded.");
          resolve();
        });
      });
    
      this._initializePromise = initializePromise;
      return initializePromise;
  };
}();

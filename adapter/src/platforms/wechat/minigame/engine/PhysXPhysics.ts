/// @ts-nocheck
// @adapter-target @galacean/engine-physics-physx
/**
   * PhysX object creation.
   */ var PhysXPhysics = /*#__PURE__*/ function() {
  /**
   * Initialize PhysXPhysics.
   * Engine 2.0's implementation, except that mini-games cannot load the PhysX script through a
   * `<script>` tag: the loader is bundled into the game and exposes `window.PHYSX` directly.
   * @returns Promise object
   */ _proto.initialize = function initialize() {
      if (this._initializeState === 2) {
        return Promise.resolve();
      } else if (this._initializeState === 1) {
        return this._initializePromise;
      }
      this._initializeState = 1;
      const initializePromise = new Promise((resolve, reject) => {
        (window).PHYSX().then((PHYSX) => {
          this._init(PHYSX);
          this._initializeState = 2;
          this._initializePromise = null;
          console.log("PhysX loaded.");
          resolve();
        }, reject).catch(reject);
      });

      this._initializePromise = initializePromise;
      return initializePromise;
  };
}();

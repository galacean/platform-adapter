import { IPhysics, PhysXRuntimeMode, InitializeState } from '@galacean/engine-physics-physx';

class PhysXPhysics {
  /** @internal PhysX wasm object */
  _physX;
  /** @internal PhysX Foundation SDK singleton class */
  _pxFoundation;
  /** @internal PhysX physics object */
  _pxPhysics;

  _runTimeMode;
  _initializeState;
  _initializePromise;

  /**
   * Initialize PhysXPhysics.
   * @param runtimeMode - Runtime mode
   * @returns Promise object
   */
  initialize() {
    const initializePromise = new Promise((resolve, reject) => {
      (window).PHYSX().then((PHYSX) => {
        this._init(PHYSX);
        this._initializeState = InitializeState.Initialized;
        this._initializePromise = null;
        console.log("PhysX loaded.");
        resolve();
      });
    });

    this._initializePromise = initializePromise;
    return initializePromise;
  }
}

/// @ts-nocheck
/**
   * PhysX object creation.
   */ var PhysXPhysics = /*#__PURE__*/ function() {
  function PhysXPhysics(runtimeMode) {
    if (runtimeMode === void 0) runtimeMode = PhysXRuntimeMode.Auto;
    this._initializeState = 0;
    this._runTimeMode = runtimeMode;
  }
  var _proto = PhysXPhysics.prototype;
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
  /**
   * Destroy PhysXPhysics.
   */ _proto.destroy = function destroy() {
      this._physX.PxCloseExtensions();
      this._pxPhysics.release();
      this._pxFoundation.release();
      this._physX = null;
      this._pxFoundation = null;
      this._pxPhysics = null;
  };
  /**
   * {@inheritDoc IPhysics.createPhysicsManager }
   */ _proto.createPhysicsManager = function createPhysicsManager() {
      return new PhysXPhysicsManager();
  };
  /**
   * {@inheritDoc IPhysics.createPhysicsScene }
   */ _proto.createPhysicsScene = function createPhysicsScene(physicsManager, onContactBegin, onContactEnd, onContactStay, onTriggerBegin, onTriggerEnd, onTriggerStay) {
      var manager = new PhysXPhysicsScene(this, physicsManager, onContactBegin, onContactEnd, onContactStay, onTriggerBegin, onTriggerEnd, onTriggerStay);
      return manager;
  };
  /**
   * {@inheritDoc IPhysics.createStaticCollider }
   */ _proto.createStaticCollider = function createStaticCollider(position, rotation) {
      return new PhysXStaticCollider(this, position, rotation);
  };
  /**
   * {@inheritDoc IPhysics.createDynamicCollider }
   */ _proto.createDynamicCollider = function createDynamicCollider(position, rotation) {
      return new PhysXDynamicCollider(this, position, rotation);
  };
  /**
   * {@inheritDoc IPhysics.createCharacterController }
   */ _proto.createCharacterController = function createCharacterController() {
      return new PhysXCharacterController(this);
  };
  /**
   * {@inheritDoc IPhysics.createPhysicsMaterial }
   */ _proto.createPhysicsMaterial = function createPhysicsMaterial(staticFriction, dynamicFriction, bounciness, frictionCombine, bounceCombine) {
      return new PhysXPhysicsMaterial(this, staticFriction, dynamicFriction, bounciness, frictionCombine, bounceCombine);
  };
  /**
   * {@inheritDoc IPhysics.createBoxColliderShape }
   */ _proto.createBoxColliderShape = function createBoxColliderShape(uniqueID, size, material) {
      return new PhysXBoxColliderShape(this, uniqueID, size, material);
  };
  /**
   * {@inheritDoc IPhysics.createSphereColliderShape }
   */ _proto.createSphereColliderShape = function createSphereColliderShape(uniqueID, radius, material) {
      return new PhysXSphereColliderShape(this, uniqueID, radius, material);
  };
  /**
   * {@inheritDoc IPhysics.createPlaneColliderShape }
   */ _proto.createPlaneColliderShape = function createPlaneColliderShape(uniqueID, material) {
      return new PhysXPlaneColliderShape(this, uniqueID, material);
  };
  /**
   * {@inheritDoc IPhysics.createCapsuleColliderShape }
   */ _proto.createCapsuleColliderShape = function createCapsuleColliderShape(uniqueID, radius, height, material) {
      return new PhysXCapsuleColliderShape(this, uniqueID, radius, height, material);
  };
  /**
   * {@inheritDoc IPhysics.createFixedJoint }
   */ _proto.createFixedJoint = function createFixedJoint(collider) {
      return new PhysXFixedJoint(this, collider);
  };
  /**
   * {@inheritDoc IPhysics.createHingeJoint }
   */ _proto.createHingeJoint = function createHingeJoint(collider) {
      return new PhysXHingeJoint(this, collider);
  };
  /**
   * {@inheritDoc IPhysics.createSpringJoint }
   */ _proto.createSpringJoint = function createSpringJoint(collider) {
      return new PhysXSpringJoint(this, collider);
  };
  _proto._init = function _init(physX) {
      var version = physX.PX_PHYSICS_VERSION;
      var defaultErrorCallback = new physX.PxDefaultErrorCallback();
      var allocator = new physX.PxDefaultAllocator();
      var pxFoundation = physX.PxCreateFoundation(version, allocator, defaultErrorCallback);
      var pxPhysics = physX.PxCreatePhysics(version, pxFoundation, new physX.PxTolerancesScale(), false, null);
      physX.PxInitExtensions(pxPhysics, null);
      this._physX = physX;
      this._pxFoundation = pxFoundation;
      this._pxPhysics = pxPhysics;
  };
  return PhysXPhysics;
}();

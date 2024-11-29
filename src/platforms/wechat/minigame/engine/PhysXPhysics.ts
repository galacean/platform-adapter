/**
 * PhysX object creation.
 */

export class PhysXPhysics implements IPhysics {
  /** @internal PhysX wasm object */
  _physX: any;
  /** @internal PhysX Foundation SDK singleton class */
  _pxFoundation: any;
  /** @internal PhysX physics object */
  _pxPhysics: any;

  private _runTimeMode: PhysXRuntimeMode;
  private _initializeState: InitializeState = InitializeState.Uninitialized;
  private _initializePromise: Promise<void>;

  constructor(runtimeMode: PhysXRuntimeMode = PhysXRuntimeMode.Auto) {
    this._runTimeMode = runtimeMode;
  }

  /**
   * Initialize PhysXPhysics.
   * @param runtimeMode - Runtime mode
   * @returns Promise object
   */
  initialize(): Promise<void> {
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

  /**
   * Destroy PhysXPhysics.
   */
  public destroy(): void {
    this._physX.PxCloseExtensions();
    this._pxPhysics.release();
    this._pxFoundation.release();
    this._physX = null;
    this._pxFoundation = null;
    this._pxPhysics = null;
  }

  /**
   * {@inheritDoc IPhysics.createPhysicsManager }
   */
  createPhysicsManager(): IPhysicsManager {
    return new PhysXPhysicsManager();
  }

  /**
   * {@inheritDoc IPhysics.createPhysicsScene }
   */
  createPhysicsScene(
    physicsManager: PhysXPhysicsManager,
    onContactBegin?: (obj1: number, obj2: number) => void,
    onContactEnd?: (obj1: number, obj2: number) => void,
    onContactStay?: (obj1: number, obj2: number) => void,
    onTriggerBegin?: (obj1: number, obj2: number) => void,
    onTriggerEnd?: (obj1: number, obj2: number) => void,
    onTriggerStay?: (obj1: number, obj2: number) => void
  ): IPhysicsScene {
    const manager = new PhysXPhysicsScene(
      this,
      physicsManager,
      onContactBegin,
      onContactEnd,
      onContactStay,
      onTriggerBegin,
      onTriggerEnd,
      onTriggerStay
    );
    return manager;
  }

  /**
   * {@inheritDoc IPhysics.createStaticCollider }
   */
  createStaticCollider(position: Vector3, rotation: Quaternion): IStaticCollider {
    return new PhysXStaticCollider(this, position, rotation);
  }

  /**
   * {@inheritDoc IPhysics.createDynamicCollider }
   */
  createDynamicCollider(position: Vector3, rotation: Quaternion): IDynamicCollider {
    return new PhysXDynamicCollider(this, position, rotation);
  }

  /**
   * {@inheritDoc IPhysics.createCharacterController }
   */
  createCharacterController(): ICharacterController {
    return new PhysXCharacterController(this);
  }

  /**
   * {@inheritDoc IPhysics.createPhysicsMaterial }
   */
  createPhysicsMaterial(
    staticFriction: number,
    dynamicFriction: number,
    bounciness: number,
    frictionCombine: number,
    bounceCombine: number
  ): IPhysicsMaterial {
    return new PhysXPhysicsMaterial(this, staticFriction, dynamicFriction, bounciness, frictionCombine, bounceCombine);
  }

  /**
   * {@inheritDoc IPhysics.createBoxColliderShape }
   */
  createBoxColliderShape(uniqueID: number, size: Vector3, material: PhysXPhysicsMaterial): IBoxColliderShape {
    return new PhysXBoxColliderShape(this, uniqueID, size, material);
  }

  /**
   * {@inheritDoc IPhysics.createSphereColliderShape }
   */
  createSphereColliderShape(uniqueID: number, radius: number, material: PhysXPhysicsMaterial): ISphereColliderShape {
    return new PhysXSphereColliderShape(this, uniqueID, radius, material);
  }

  /**
   * {@inheritDoc IPhysics.createPlaneColliderShape }
   */
  createPlaneColliderShape(uniqueID: number, material: PhysXPhysicsMaterial): IPlaneColliderShape {
    return new PhysXPlaneColliderShape(this, uniqueID, material);
  }

  /**
   * {@inheritDoc IPhysics.createCapsuleColliderShape }
   */
  createCapsuleColliderShape(
    uniqueID: number,
    radius: number,
    height: number,
    material: PhysXPhysicsMaterial
  ): ICapsuleColliderShape {
    return new PhysXCapsuleColliderShape(this, uniqueID, radius, height, material);
  }

  /**
   * {@inheritDoc IPhysics.createFixedJoint }
   */
  createFixedJoint(collider: PhysXCollider): IFixedJoint {
    return new PhysXFixedJoint(this, collider);
  }

  /**
   * {@inheritDoc IPhysics.createHingeJoint }
   */
  createHingeJoint(collider: PhysXCollider): IHingeJoint {
    return new PhysXHingeJoint(this, collider);
  }

  /**
   * {@inheritDoc IPhysics.createSpringJoint }
   */
  createSpringJoint(collider: PhysXCollider): ISpringJoint {
    return new PhysXSpringJoint(this, collider);
  }

  private _init(physX: any): void {
    const version = physX.PX_PHYSICS_VERSION;
    const defaultErrorCallback = new physX.PxDefaultErrorCallback();
    const allocator = new physX.PxDefaultAllocator();
    const pxFoundation = physX.PxCreateFoundation(version, allocator, defaultErrorCallback);
    const pxPhysics = physX.PxCreatePhysics(version, pxFoundation, new physX.PxTolerancesScale(), false, null);

    physX.PxInitExtensions(pxPhysics, null);
    this._physX = physX;
    this._pxFoundation = pxFoundation;
    this._pxPhysics = pxPhysics;
  }
}

enum InitializeState {
  Uninitialized,
  Initializing,
  Initialized
}

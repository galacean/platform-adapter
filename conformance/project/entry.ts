// Entry of the conformance mini-game. The runner generates `conformance.config.ts` and the assets.
import "polyfill";
import "./basis_transcoder";
import "./physx.release";
import { PhysXPhysics } from "@galacean/engine-physics-physx";
import { runConformance } from "./harness";
import { platformApiCases } from "./cases/platform-api";
import { buildCases, engineCases, engineOverrideCases } from "./cases/engine";

runConformance(
  [...platformApiCases, ...engineOverrideCases, ...buildCases, ...engineCases],
  () => new PhysXPhysics()
);

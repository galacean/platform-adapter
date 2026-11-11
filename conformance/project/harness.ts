// Conformance harness that runs inside the mini-game.
// User code is not rewritten by the adapter, so it reaches Web APIs through `GameGlobal.platformAdapter`
// on purpose: that is exactly the object the rewritten Engine code calls.
import { Camera, Engine, Entity, Script, Vector3, WebGLEngine } from "@galacean/engine";
import config from "./conformance.config";

declare const GameGlobal: any;
declare const wx: any;
declare const tt: any;
declare const my: any;

export type Status = "pass" | "fail" | "skip" | "manual" | "known";
export type Category = "platform-api" | "engine-override" | "build" | "engine";

export interface CaseResult {
  status: Status;
  detail?: string;
}

export interface Context {
  engine: Engine;
  /** Fresh root entity for this case; destroyed afterwards. */
  root: Entity;
  /** The platform API bundle (`wx`, `tt` or `my`). */
  api: any;
  /** `GameGlobal.platformAdapter`. */
  adapter: any;
  /** Base URL that serves `assets/*` over HTTP from the runner. */
  remote: string;
  /** Local path of the conformance assets inside the package. */
  local: string;
  physics: boolean;
  /** Why PhysX could not initialize, if it could not. */
  physicsError: string;
  wait(ms: number): Promise<void>;
  /** Reads RGBA pixels of canvas regions right after a rendered frame (origin: bottom-left). */
  capture(regions: Region[], afterFrames?: number): Promise<Uint8Array[]>;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Case {
  id: string;
  category: Category;
  title: string;
  /** The adapter feature this case covers (file, Web API or override). */
  covers: string;
  timeout?: number;
  /** Show the detail of a passed case in the on-device summary: a measurement the tester should see. */
  showDetail?: boolean;
  /** The case downloads from the runner's HTTP server. Skipped when the game cannot reach it (a device on another network). */
  remote?: boolean;
  run(ctx: Context): Promise<CaseResult | void>;
}

export class AssertionError extends Error {}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AssertionError(message);
}

// Douyin also defines `wx`, so the platform the game was built for decides, not which globals exist.
export const api = config.platform === "tiktok" ? tt : config.platform === "alipay" ? my : wx;

/** The DevTools simulator reports the platform "devtools". A device run ignores its reports. */
const simulator = (() => {
  try {
    return api.getSystemInfoSync().platform === "devtools";
  } catch {
    return false;
  }
})();

/** False once a report failed: a device that cannot reach the runner must not wait for every later report. */
let collectorReachable = true;

function post(path: string, data: unknown): Promise<boolean> {
  if (!collectorReachable) return Promise.resolve(false);
  return new Promise((resolve) => {
    const headers = { "content-type": "application/json" };
    api.request({
      url: `${config.collector}${path}`,
      method: "POST",
      header: headers,
      headers,
      timeout: 5000,
      data: JSON.stringify({ ...(data as object), simulator }),
      success: () => resolve(true),
      fail: () => {
        collectorReachable = false;
        resolve(false);
      }
    });
  });
}

const MARK: Record<Status, string> = { pass: "✓", fail: "✗", skip: "-", manual: "?", known: "!" };

/**
 * The result on the screen and in the console, for runs where the runner cannot be reached: the WebGL
 * canvas cannot host a 2D overlay, so it is a modal the tester screenshots.
 */
function showSummary(finished: Array<{ id: string; showDetail?: boolean } & CaseResult>): void {
  const counts: Partial<Record<Status, number>> = {};
  for (const result of finished) counts[result.status] = (counts[result.status] ?? 0) + 1;
  const head = (Object.keys(counts) as Status[]).map((status) => `${status} ${counts[status]}`).join(" · ");
  // Failures first, then known platform behavior, then the measurements of passed cases: all worth a look on a device.
  const shown = [
    ...finished.filter((result) => result.status === "fail"),
    ...finished.filter((result) => result.status === "known"),
    ...finished.filter((result) => result.status === "pass" && result.showDetail && result.detail)
  ];
  const lines = shown.map((result) => `${MARK[result.status]} ${result.id}: ${String(result.detail ?? "").split("\n")[0].slice(0, 90)}`);
  console.log(`[conformance] ${config.platform} ${config.engineVersion} run ${config.runId}: ${head}`);
  for (const result of finished) {
    if (result.status !== "pass") console.log(`[conformance] ${MARK[result.status]} ${result.id}: ${result.detail ?? ""}`);
  }
  if (config.target !== "device" && collectorReachable) return;
  api.showModal?.({
    title: `${config.platform} ${config.engineVersion} · ${config.runId}`,
    content: [head, collectorReachable ? "已上报" : "未连上电脑，请截图", ...lines.slice(0, 14)].join("\n"),
    showCancel: false
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function describeError(error: any): string {
  if (!error) return String(error);
  const message = error.message ?? String(error);
  const stack = typeof error.stack === "string" ? error.stack.split("\n").slice(0, 4).join("\n") : "";
  return stack && !stack.includes(message) ? `${message}\n${stack}` : stack || message;
}

class PixelCapture extends Script {
  frames = 0;
  afterFrames = 3;
  regions: Region[] = [];
  resolve: (pixels: Uint8Array[]) => void;
  reject: (error: Error) => void;

  onEndRender(): void {
    if (++this.frames < this.afterFrames) return;
    try {
      const gl = (this.engine as any)._hardwareRenderer.gl as WebGLRenderingContext;
      const pixels = this.regions.map(({ x, y, width, height }) => {
        const out = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, out);
        return out;
      });
      this.resolve(pixels);
    } catch (error) {
      this.reject(error);
    }
    this.destroy();
  }
}

async function createEngine(physics: any): Promise<WebGLEngine> {
  return WebGLEngine.create({
    canvas: GameGlobal.platformAdapter.canvas,
    physics,
    graphicDeviceOptions: { webGLMode: config.webGLMode, alpha: false } as any
  });
}

/** Text of console arguments, safe for circular objects and errors. */
function consoleText(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return describeError(arg);
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ")
    .slice(0, 2000);
}

export interface ConsoleEntry {
  level: "error" | "warn";
  text: string;
}

/** Records console.error / console.warn so every message DevTools shows is attributed to a case. */
function captureConsole(sink: ConsoleEntry[]): void {
  for (const level of ["error", "warn"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      sink.push({ level, text: consoleText(args) });
      original(...args);
    };
  }
}

export async function runConformance(cases: Case[], createPhysics?: () => any): Promise<void> {
  const consoleEntries: ConsoleEntry[] = [];
  captureConsole(consoleEntries);
  const errors: string[] = [];
  api.onError?.((error: any) => errors.push(describeError(error)));
  api.onUnhandledRejection?.((event: any) => errors.push(`unhandled rejection: ${describeError(event?.reason)}`));

  const started = Date.now();
  const device = describeDevice();
  await post("/start", { runId: config.runId, total: cases.length, ids: cases.map((testCase) => testCase.id), device });

  // PhysX is optional: when it cannot initialize, physics cases are reported as failed by
  // `physx-initialize`, and the remaining cases still run on an engine without physics.
  let engine: WebGLEngine;
  let physics = false;
  let physicsError = "";
  if (createPhysics) {
    try {
      engine = await withTimeout(createEngine(createPhysics()), 15000, "WebGLEngine.create with PhysX");
      physics = true;
    } catch (error) {
      physicsError = describeError(error);
    }
  }
  if (!engine) engine = await createEngine(undefined);
  const startupConsole = consoleEntries.splice(0);

  const scene = engine.sceneManager.activeScene;
  scene.background.solidColor.set(0, 0, 0, 1);
  const cameraEntity = scene.createRootEntity("conformance-camera");
  cameraEntity.transform.setPosition(0, 0, 10);
  cameraEntity.transform.lookAt(new Vector3(0, 0, 0));
  const camera = cameraEntity.addComponent(Camera);
  camera.isOrthographic = true;
  camera.orthographicSize = 5;
  engine.run();

  const base: Omit<Context, "root"> = {
    engine,
    api,
    adapter: GameGlobal.platformAdapter,
    remote: `${config.collector}/assets`,
    local: "public/conformance",
    physics,
    physicsError,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    capture(regions, afterFrames = 3) {
      return new Promise((resolve, reject) => {
        const capture = cameraEntity.addComponent(PixelCapture);
        capture.regions = regions;
        capture.afterFrames = afterFrames;
        capture.resolve = resolve;
        capture.reject = reject;
      });
    }
  };

  const finished: Array<{ id: string; showDetail?: boolean } & CaseResult> = [];
  for (const testCase of cases) {
    const root = scene.createRootEntity(`case-${testCase.id}`);
    const caseStarted = Date.now();
    const errorCount = errors.length;
    consoleEntries.length = 0;
    let result: CaseResult;
    if (testCase.remote && !collectorReachable) {
      result = { status: "skip", detail: "游戏连不上电脑上的资源服务，无法测试远程加载" };
    } else {
      try {
        result = (await withTimeout(testCase.run({ ...base, root }), testCase.timeout ?? 10000, testCase.id)) || {
          status: "pass"
        };
      } catch (error) {
        result = { status: "fail", detail: describeError(error) };
      }
    }
    if (result.status === "pass" && errors.length > errorCount) {
      result = { status: "fail", detail: `uncaught error during case: ${errors.slice(errorCount).join("\n")}` };
    }
    root.destroy();
    finished.push({ id: testCase.id, showDetail: testCase.showDetail, ...result });
    await post("/result", {
      runId: config.runId,
      id: testCase.id,
      category: testCase.category,
      title: testCase.title,
      covers: testCase.covers,
      ms: Date.now() - caseStarted,
      console: consoleEntries.splice(0),
      ...result
    });
  }

  await post("/done", {
    runId: config.runId,
    ms: Date.now() - started,
    uncaught: errors,
    startupConsole,
    afterConsole: consoleEntries.splice(0)
  });
  showSummary(finished);
}

/** Where the game runs: the simulator reports platform "devtools". */
function describeDevice(): string {
  try {
    const info = api.getSystemInfoSync();
    return [info.platform, info.brand, info.model, info.system, `app ${info.version}`, `SDK ${info.SDKVersion}`].filter(Boolean).join(" · ");
  } catch (error) {
    return `unknown (${describeError(error)})`;
  }
}

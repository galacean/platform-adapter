// Douyin (TikTok) mini-game: drives 抖音开发者工具 through its `douyinide` CLI
// (/Applications/抖音开发者工具.app/Contents/Resources/douyin-ide-skill). Requires the IDE to be logged in.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const CLIENT = "galacean-conformance";

async function call(args, { allowFailure = false, timeout = 180000 } = {}) {
  const cli = process.env.DOUYIN_DEVTOOLS_CLI || "douyinide";
  let output;
  try {
    const { stdout, stderr } = await run(cli, ["-c", CLIENT, ...args], { timeout, maxBuffer: 16 << 20 });
    output = `${stdout}\n${stderr}`;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Douyin DevTools CLI `douyinide` not found. Install 抖音开发者工具 and its CLI, or set DOUYIN_DEVTOOLS_CLI.");
    }
    output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (!allowFailure) throw new Error(`douyinide ${args[0]} failed:\n${output.trim().slice(0, 1200)}`);
  }
  return output;
}

/** The CLI prints one JSON document; some commands print a banner line before it. */
function json(output) {
  const start = output.search(/[{[]/);
  try {
    return JSON.parse(output.slice(start));
  } catch {
    return undefined;
  }
}

async function windowId(projectDir) {
  const info = json(await call(["get-project-windows-info"], { allowFailure: true }));
  return (info?.codeWindows ?? []).find((w) => w.project?.uri?.fsPath === projectDir)?.id;
}

async function online() {
  return json(await call(["check-ide-status"], { allowFailure: true }));
}

export default {
  name: "tiktok",
  label: "抖音小游戏",
  api: "tt",
  /** The Editor export loads the wasm subpackage with `wx.loadSubpackage` on Douyin too (Douyin defines `wx`). */
  entryApi: "wx",
  webGLMode: 0,
  appidEnv: "DOUYIN_APPID",
  /** Douyin's tourist AppID: the IDE opens it and previews it from an open project window. */
  fallbackAppId: "testAppId",
  attachWithoutAppId: false,
  /**
   * Code the Douyin compilers reject, measured in the IDE. The preview compiler fails with "SyntaxError" on
   * everything newer than ES2018 except class fields, including BigInt literals (the simulator accepts it,
   * so only this check or a real preview finds it). Both compilers fail on `require("node:…")`, even in dead code.
   */
  rejectedSyntax: ["optional-catch", "optional-chaining", "nullish", "logical-assignment", "numeric-separator", "private-name", "static-block", "bigint-literal", "node-require"],
  projectFiles({ appid, projectname, game }) {
    return {
      "game.json": game,
      "project.config.json": {
        description: "Galacean platform-adapter conformance",
        setting: { urlCheck: false, es6: true, postcss: true, minified: true, newFeature: true },
        compileType: "game",
        libVersion: "latest",
        projectname,
        appid
      }
    };
  },
  async check() {
    let status = await online();
    if (!status?.ideOnline) {
      await call(["start-ide"], { allowFailure: true });
      for (let i = 0; i < 30 && !status?.ideOnline; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        status = await online();
      }
    }
    if (!status?.ideOnline) throw new Error("抖音开发者工具 is not running and could not be started.");
    if (status.loginExpired || !status.loginUser) throw new Error("抖音开发者工具 is not logged in. Open it and log in.");
  },
  /** Reopens the project window so the simulator runs a fresh build. */
  async open(projectDir) {
    await call(["close-project-window", "--project-path", projectDir], { allowFailure: true });
    await call(["open-project-window", "--path", projectDir, "--type", "microgame", "--mode", "full"]);
  },
  async close(projectDir) {
    await call(["close-project-window", "--project-path", projectDir], { allowFailure: true });
  },
  /** Runs the preview compiler and writes the QR code a device scans. The project window must be open. */
  async preview(projectDir, qrFile) {
    let id;
    for (let i = 0; i < 20 && id === undefined; i++) {
      id = await windowId(projectDir);
      if (id === undefined) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    const target = id === undefined ? ["--project-path", projectDir] : ["--window-id", String(id)];
    const output = await call(["preview", ...target, "--mode", "qrcode", "--show-in-ide", "--file-name", qrFile], { allowFailure: true, timeout: 300000 });
    const result = json(output);
    if (!existsSync(qrFile) || result?.ok === false) {
      throw new Error(`抖音开发者工具 did not produce a preview QR code:\n${String(result?.error ?? output).trim().slice(0, 1500)}`);
    }
  }
};

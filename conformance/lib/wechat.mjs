// WeChat mini-game: drives WeChat DevTools through its CLI. Requires DevTools to be logged in, with
// Settings → Security → Service Port turned on.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);
const DEFAULT_CLI = "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";

function cli() {
  const file = process.env.WECHAT_DEVTOOLS_CLI || DEFAULT_CLI;
  if (!existsSync(file)) {
    throw new Error(`WeChat DevTools CLI not found at ${file}. Install DevTools or set WECHAT_DEVTOOLS_CLI.`);
  }
  return file;
}

async function call(args, { allowFailure = false, timeout = 180000 } = {}) {
  try {
    const { stdout, stderr } = await run(cli(), [...args, "--lang", "en"], { timeout, maxBuffer: 16 << 20 });
    return `${stdout}\n${stderr}`;
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim();
    if (allowFailure) return output;
    if (/service port disabled/i.test(output)) {
      throw new Error("WeChat DevTools service port is off: open DevTools → Settings → Security and turn on Service Port.");
    }
    if (/AppID/i.test(output)) {
      throw new Error(`WeChat DevTools rejected the AppID. Use an AppID you own (a test AppID works).\n${output.slice(0, 600)}`);
    }
    throw new Error(`WeChat DevTools CLI ${args[0]} failed:\n${output.slice(0, 1200)}`);
  }
}

export default {
  name: "wechat",
  label: "微信小游戏",
  /** The global that carries the platform API inside the game. */
  api: "wx",
  webGLMode: 0,
  appidEnv: "WECHAT_APPID",
  /** Used when no AppID is configured. DevTools' CLI refuses to open or preview it: see `attachWithoutAppId`. */
  fallbackAppId: "touristappid",
  /** Without an own AppID the project is imported once through the DevTools UI and later runs attach to it. */
  attachWithoutAppId: true,
  /** The same files the Editor export writes (`templates/minigame/project.config.json.ejs`). */
  projectFiles({ appid, projectname, game }) {
    return {
      "game.json": game,
      "project.config.json": {
        description: "Galacean platform-adapter conformance",
        setting: {
          urlCheck: false,
          es6: true,
          postcss: true,
          minified: true,
          newFeature: true,
          useCompilerPlugins: ["typescript"],
          swc: false,
          enhance: true
        },
        compileType: "game",
        libVersion: "latest",
        projectname,
        appid,
        condition: {},
        packOptions: { ignore: [], include: [] }
      }
    };
  },
  async check() {
    const output = await call(["islogin"]);
    if (!/"login"\s*:\s*true/.test(output)) {
      throw new Error("WeChat DevTools is not logged in. Open DevTools and scan the QR code.");
    }
  },
  /** Closes the project if it is open, then opens it so the simulator runs a fresh build. */
  async open(projectDir) {
    await call(["close", "--project", projectDir], { allowFailure: true });
    await call(["open", "--project", projectDir]);
  },
  async close(projectDir) {
    await call(["close", "--project", projectDir], { allowFailure: true });
  },
  /** Uploads a preview build and writes the QR code a device scans. */
  async preview(projectDir, qrFile) {
    const output = await call(["preview", "--project", projectDir, "--qr-format", "image", "--qr-output", qrFile], { timeout: 300000 });
    if (!existsSync(qrFile)) throw new Error(`WeChat DevTools did not produce a preview QR code:\n${output.slice(-1200)}`);
  }
};

#!/usr/bin/env node
// Conformance runner: builds the conformance mini-game with this repository's adapter the way the Editor
// exports a game, runs it on one platform, and reports every case.
//
//   node conformance/run.mjs wechat            # WeChat DevTools simulator
//   node conformance/run.mjs tiktok            # 抖音开发者工具 simulator
//   node conformance/run.mjs alipay            # Alipay: stops with the reason, the adapter cannot build it yet
//   node conformance/run.mjs wechat --device   # real device: prints a preview QR code to scan
//
// Options: --engine <version>  --appid <id>  --host <LAN address for --device>  --timeout <seconds>
//          --dev (unminified build)  --build-only  --keep-open  --no-adapter-build
//
// The AppID comes from --appid, the platform's environment variable (WECHAT_APPID, DOUYIN_APPID,
// ALIPAY_APPID) or conformance/.local.json ({ "wechat": { "appid": "…" } }); otherwise the platform's
// tourist AppID is used. WeChat's CLI refuses the tourist AppID: import the printed directory into
// DevTools once (AppID: 测试号) and later runs attach to it; `--device` on WeChat needs an own AppID.
//
// Simulators are browsers: they have `window`, `FontFace`, modern syntax and lenient decoders that devices
// do not. A platform is only covered when its `--device` run passes too.
import { execFile, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeAssets } from "./lib/assets.mjs";
import { incompleteRun } from "./lib/complete.mjs";
import { startCollector } from "./lib/collector.mjs";
import { syncBuild } from "./lib/sync.mjs";
import { findRejectedSyntax } from "./lib/syntax.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const PLATFORMS = ["wechat", "tiktok", "alipay"];
/** Main package limit of WeChat and Douyin mini-games. */
const MAIN_PACKAGE_LIMIT = 4 * 1024 * 1024;
const SUBPACKAGES = [
  // The same entry the Editor export adds when the game uses PhysX or KTX2.
  { name: "wasm", root: "public/wasmSubpackage" },
  { name: "conf-sub", root: "public/conf-sub" },
  { name: "conf-sub-top", root: "conf-sub-top" }
];

function parseArgs(argv) {
  const args = { adapterBuild: true, keepOpen: false, buildOnly: false, device: false, minify: true };
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) {
      args.platform = argv[i];
      continue;
    }
    const [key, inline] = argv[i].slice(2).split("=");
    const take = () => inline ?? argv[++i];
    if (key === "platform") args.platform = take();
    else if (key === "engine") args.engine = take();
    else if (key === "appid") args.appid = take();
    else if (key === "host") args.host = take();
    else if (key === "timeout") args.timeout = Number(take());
    else if (key === "start-timeout") args.startTimeout = Number(take());
    else if (key === "device") args.device = true;
    else if (key === "dev") args.minify = false;
    else if (key === "no-adapter-build") args.adapterBuild = false;
    else if (key === "keep-open") args.keepOpen = true;
    else if (key === "build-only") args.buildOnly = true;
    else if (key === "help" || key === "h") args.help = true;
    else throw new Error(`Unknown option --${key}`);
  }
  // A tester has to pick up the phone and scan, so a device run waits longer for the game to start.
  args.timeout ??= args.device ? 900 : 300;
  args.startTimeout ??= args.device ? 600 : 90;
  return args;
}

function sh(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "pipe", encoding: "utf8", maxBuffer: 64 << 20, ...options });
}

function resolveAppId(platform, explicit) {
  if (explicit) return explicit;
  if (process.env[platform.appidEnv]) return process.env[platform.appidEnv];
  const local = path.join(here, ".local.json");
  if (existsSync(local)) {
    const appid = JSON.parse(readFileSync(local, "utf8"))[platform.name]?.appid;
    if (appid) return appid;
  }
  return undefined;
}

function lanAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  throw new Error("No LAN address found for the device to report to. Pass --host <address>.");
}

function prepareProject(work, engineVersion, platform) {
  const project = path.join(work, "project");
  // Keep node_modules between runs; replace everything else.
  mkdirSync(project, { recursive: true });
  for (const name of readdirSync(project)) {
    if (name !== "node_modules") rmSync(path.join(project, name), { recursive: true, force: true });
  }
  cpSync(path.join(here, "project"), project, { recursive: true });

  // The Editor export's entry when the game has a wasm subpackage (MiniGamePackage.ts): load the
  // subpackage, then start the game. A device cannot instantiate the wasm files before that.
  writeFileSync(
    path.join(project, "game.ts"),
    `${platform.entryApi ?? platform.api}.loadSubpackage({
  name: "wasm",
  complete: function (res) {
    console.log("load wasm complete");
    require("./entry");
  },
  success: function (res) {},
  fail: function (res) {
    console.log("load wasm fail: " + res);
  }
});
`
  );

  const packageJson = {
    name: "conformance",
    version: "1.0.0",
    private: true,
    main: "game.ts",
    dependencies: {
      "@galacean/engine": engineVersion,
      "@galacean/engine-physics-physx": engineVersion,
      "conformance-dep": "file:./deps/conformance-dep"
    }
  };
  writeFileSync(path.join(project, "package.json"), JSON.stringify(packageJson, null, 2));

  const installed = path.join(project, "node_modules/@galacean/engine/package.json");
  const installedVersion = existsSync(installed) ? JSON.parse(readFileSync(installed, "utf8")).version : null;
  if (installedVersion !== engineVersion || !existsSync(path.join(project, "node_modules/conformance-dep"))) {
    console.log(`Installing Engine ${engineVersion} …`);
    sh("npm", ["install", "--no-audit", "--no-fund", "--no-package-lock"], { cwd: project });
  }
  return project;
}

function writePlatformFiles(project, platform, appid) {
  const game = {
    deviceOrientation: "portrait",
    networkTimeout: { request: 60000, connectSocket: 60000, uploadFile: 60000, downloadFile: 60000 },
    subpackages: SUBPACKAGES
  };
  const files = platform.projectFiles({ appid, projectname: `galacean-conformance-${platform.name}`, game });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(project, name), JSON.stringify(content, null, 2));
  }
  writeFileSync(path.join(project, "wasm-config.json"), JSON.stringify({ engine: { physx: true, ktx2: true } }));
}

function directorySize(dir, skip = () => false, root = dir) {
  let size = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (skip(path.relative(root, full))) continue;
    size += entry.isDirectory() ? directorySize(full, skip, root) : statSync(full).size;
  }
  return size;
}

/** Checks of the build output that no simulator performs. */
function buildChecks(output, platform) {
  const results = [];
  const main = directorySize(output, (file) => SUBPACKAGES.some(({ root }) => file === root));
  const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
  results.push({
    id: "build-main-package-size",
    category: "build",
    title: "主包不超过 4 MB",
    covers: "project-builder --minify; the wasm files live in a subpackage",
    status: main <= MAIN_PACKAGE_LIMIT ? "pass" : "fail",
    detail: `主包 ${kb(main)}，上限 ${kb(MAIN_PACKAGE_LIMIT)}${main > MAIN_PACKAGE_LIMIT ? "：真机预览和上传会被拒绝" : ""}`
  });
  if (platform.rejectedSyntax) {
    const found = findRejectedSyntax(output, platform.rejectedSyntax);
    results.push({
      id: "build-syntax",
      category: "build",
      title: "产物里没有平台预览编译器不支持的语法",
      covers: "compileTarget in adapter/bundle/API.ts (swc target per platform)",
      status: found.length ? "fail" : "pass",
      detail: found.length ? found.join("\n") : "没有发现"
    });
  }
  return results;
}

const STATUS_MARK = { pass: "✅", fail: "❌", skip: "⏭️", manual: "👤", known: "⚠️", missing: "⛔" };

function report(results, meta, outDir) {
  const counts = {};
  for (const result of results) counts[result.status] = (counts[result.status] ?? 0) + 1;
  const lines = [
    `# Conformance: ${meta.label} (${meta.platform}), ${{ device: "真机", simulator: "开发者工具模拟器", build: "只构建" }[meta.target]}, Engine ${meta.engine}`,
    "",
    `Run ${meta.runId} · ${new Date().toISOString()} · adapter ${meta.adapter} · ${meta.minify ? "minified" : "unminified"} build`,
    "",
    `运行环境：${meta.device ?? "游戏没有上报"}`,
    ...(meta.note ? ["", `> ${meta.note}`] : []),
    "",
    Object.entries(counts)
      .map(([status, count]) => `${STATUS_MARK[status] ?? ""} ${status} ${count}`)
      .join(" · "),
    "",
    "| | Case | Category | Covers | Detail |",
    "|---|---|---|---|---|"
  ];
  for (const r of results) {
    const detail = (r.detail ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
    lines.push(`| ${STATUS_MARK[r.status] ?? r.status} | ${r.id} — ${r.title ?? ""} | ${r.category ?? ""} | ${r.covers ?? ""} | ${detail} |`);
  }
  if (meta.uncaught?.length) lines.push("", "## Uncaught errors", "", ...meta.uncaught.map((e) => `- ${e.replace(/\n/g, " ")}`));
  // Every console.error / console.warn the game printed, attributed to the case that was running.
  const consoleGroups = [
    ["启动（创建 Engine）", meta.startupConsole ?? []],
    ...results.map((r) => [r.id, r.console ?? []]),
    ["全部用例结束后", meta.afterConsole ?? []]
  ].filter(([, entries]) => entries.length);
  if (consoleGroups.length) {
    lines.push("", "## 控制台输出（console.error / console.warn）", "");
    for (const [label, entries] of consoleGroups) {
      lines.push(`**${label}**`, "");
      for (const entry of entries) lines.push(`- ${entry.level === "error" ? "🔴" : "🟡"} ${entry.text.replace(/\n/g, " ").slice(0, 400)}`);
      lines.push("");
    }
  }
  const markdown = lines.join("\n");
  const name = `report-${meta.target}`;
  writeFileSync(path.join(outDir, `${name}.md`), markdown);
  writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ ...meta, counts, results }, null, 2));
  return { markdown, counts, file: path.join(outDir, `${name}.md`) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.platform) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 20).filter((line) => line.startsWith("//")).map((line) => line.slice(3)).join("\n"));
    if (!args.help) process.exitCode = 2;
    return;
  }
  if (!PLATFORMS.includes(args.platform)) throw new Error(`Unsupported platform '${args.platform}'. Supported: ${PLATFORMS.join(", ")}`);
  const platform = (await import(`./lib/${args.platform}.mjs`)).default;
  const target = args.device ? "device" : "simulator";

  const engine = args.engine ?? sh("npm", ["view", "@galacean/engine@alpha", "version"]).trim();
  const ownAppId = resolveAppId(platform, args.appid);
  const appid = ownAppId ?? platform.fallbackAppId;
  // Some CLIs refuse to open a project with the tourist AppID: those runs attach to a project that was
  // imported once through the DevTools UI.
  const attach = !ownAppId && platform.attachWithoutAppId && !args.buildOnly;
  if (attach && args.device) {
    throw new Error(`A ${platform.label} device preview needs an AppID: pass --appid, set ${platform.appidEnv}, or add it to conformance/.local.json.`);
  }
  const buildable = JSON.parse(readFileSync(path.join(repo, "builder/config/platform.json"), "utf8")).minigame ?? {};
  if (!(platform.name in buildable)) {
    throw new Error(
      `适配器的构建器还不能构建${platform.label}（builder/config/platform.json 的 minigame 里只有 ${Object.keys(buildable).join("、")}），所以${platform.label}没有可以运行的测试。`
    );
  }
  if (!args.buildOnly) await platform.check();

  if (args.adapterBuild) {
    console.log("Building the adapter …");
    sh("pnpm", ["run", "prepare"], { cwd: repo });
  }
  const adapter = sh("git", ["rev-parse", "--short", "HEAD"], { cwd: repo }).trim() + (sh("git", ["status", "--porcelain"], { cwd: repo }).trim() ? "+dirty" : "");

  const work = path.join(here, ".work", `${platform.name}-${engine}`);
  const project = prepareProject(work, engine, platform);
  const { servedDir, redPngBase64 } = await writeAssets(project);
  writePlatformFiles(project, platform, appid);

  const runId = `${Date.now().toString(36)}`;
  const collector = await startCollector({
    assetsDir: servedDir,
    runId,
    host: args.device ? args.host ?? lanAddress() : "127.0.0.1",
    // The simulator may run the same build while a device is being tested.
    accept: (data) => !(args.device && data.simulator),
    onResult: (r) => console.log(`${STATUS_MARK[r.status] ?? r.status} ${r.id}${r.status === "fail" ? `: ${String(r.detail).split("\n")[0]}` : ""}`)
  });
  // The collector keeps the process alive: close it however the run ends, or a failure below hangs the runner.
  try {
    writeFileSync(
      path.join(project, "conformance.config.ts"),
      `export default ${JSON.stringify(
        { collector: collector.url, runId, platform: platform.name, target, engineVersion: engine, webGLMode: platform.webGLMode, redPngBase64 },
        null,
        2
      )};\n`
    );

    // Build into a staging directory, then sync into the directory DevTools has open (see lib/sync.mjs).
    // The flags are the Editor export's `release` script; `--dev` drops --minify for readable stacks.
    const staging = path.join(work, "staging");
    const output = path.join(work, "dist");
    rmSync(staging, { recursive: true, force: true });
    console.log(`Building the conformance game for ${platform.label} …`);
    try {
      sh(process.execPath, [
        path.join(repo, "cli/builder/build.js"),
        "--project", project,
        "--entry", "game.ts",
        "--subpackages", "entry.ts",
        "--output", staging,
        "--platform", platform.name,
        "--app", "minigame",
        ...(args.minify ? ["--minify"] : []),
        "--extraWASM", "./wasm-config.json",
        "--assets", "public", "conf-sub-top"
      ], { cwd: project });
    } catch (error) {
      throw new Error(`Building the conformance game failed:\n${error.stdout ?? ""}\n${error.stderr ?? ""}`);
    }
    const built = buildChecks(staging, platform);
    for (const r of built) console.log(`${STATUS_MARK[r.status]} ${r.id}${r.status === "fail" ? `: ${r.detail.split("\n")[0]}` : ""}`);

    const synced = syncBuild(staging, output, path.join(work, "dist-manifest.json"), ["conformance.config.js", "entry.js", "game.js"]);
    console.log(`Synced ${synced.copied} changed and removed ${synced.removed} stale of ${synced.total} files into ${output}`);

    const meta = { platform: platform.name, label: platform.label, target, engine, runId, adapter, minify: args.minify };
    if (args.buildOnly) {
      const { markdown, counts, file } = report(built, { ...meta, target: "build", device: "只构建，没有运行" }, work);
      console.log(`\n${markdown}\n\nBuilt ${output}\nReport: ${file}`);
      if (counts.fail) process.exitCode = 1;
      return;
    }

    let launchError;
    try {
      if (attach) {
        console.log(
          `\nNo AppID: using the tourist AppID. If this directory is not open in DevTools yet, import it once\n` +
            `(Import → directory below → AppID 测试号). DevTools recompiles it on later runs; click 编译 if it does not.\n  ${output}\n`
        );
      } else if (args.device) {
        const qr = path.join(work, "preview-qr.png");
        rmSync(qr, { force: true });
        // Douyin previews from an open project window.
        if (platform.name === "tiktok") await platform.open(output);
        console.log("Uploading a preview build …");
        await platform.preview(output, qr, { appid });
        console.log(`\n用${platform.label.replace("小游戏", "")}扫描二维码：${qr}\n手机和电脑在同一个局域网时结果自动回传（${collector.url}）；否则游戏结束时弹窗显示结果，请截图。\n`);
        if (process.platform === "darwin") execFile("open", [qr]);
      } else {
        console.log(`Opening ${output} in DevTools …`);
        await platform.open(output);
      }
    } catch (error) {
      launchError = error;
    }

    let outcome = "launch-failed";
    if (!launchError) {
      // Unreferenced timers: they must not keep the process alive after the run finishes.
      const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), args.timeout * 1000).unref());
      const startTimeout = new Promise((resolve) =>
        setTimeout(() => resolve(collector.started ? new Promise(() => {}) : "no-start"), args.startTimeout * 1000).unref()
      );
      outcome = await Promise.race([collector.finished.then(() => "done"), timeout, startTimeout]);
    }
    if (!args.keepOpen && !attach && !args.device) await platform.close(output);

    const expected = collector.started?.total ?? 0;
    const results = [...built, ...collector.results];
    if (outcome === "launch-failed") {
      results.push({ id: args.device ? "preview" : "launch", status: "fail", category: "build", title: args.device ? "生成真机预览" : "在开发者工具里打开", detail: launchError.message });
    } else if (outcome !== "done") {
      const noStart = args.device
        ? "手机上的游戏没有连上电脑（没有扫码，或者不在同一个局域网）：看手机上的结果弹窗"
        : "游戏没有启动或无法连接收集服务（查看 DevTools 控制台）";
      results.push({
        id: outcome === "no-start" ? "game-start" : "run-complete",
        status: "missing",
        title: outcome === "no-start" ? noStart : `超时：${collector.results.length}/${expected} 个用例有结果`
      });
    } else {
      // "done" only says the game reached its end: check that it reported every case it announced, once.
      const problem = incompleteRun(collector.started?.ids, collector.results);
      if (problem) results.push({ id: "run-complete", status: "missing", title: `结果不完整：${problem}` });
    }
    const { markdown, counts, file } = report(results, {
        ...meta,
        device: collector.started?.device,
        uncaught: collector.done?.uncaught,
        startupConsole: collector.done?.startupConsole,
        afterConsole: collector.done?.afterConsole
      }, work);
    console.log(`\n${markdown}\n\nReport: ${file}`);
    if (counts.fail || counts.missing) process.exitCode = 1;
  } finally {
    await collector.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 2;
});

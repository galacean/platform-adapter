// Engine source overrides (`adapter/src/platforms/<platform>/minigame/engine`), build-time rewrites,
// and Engine features that go through platform APIs.
import {
  AudioClip,
  AudioSource,
  Color,
  DirectLight,
  DynamicCollider,
  Font,
  GLTFResource,
  MeshColliderShape,
  MeshRenderer,
  PBRMaterial,
  PlaneColliderShape,
  PrimitiveMesh,
  Sprite,
  SpriteRenderer,
  SphereColliderShape,
  StaticCollider,
  SystemInfo,
  TextRenderer,
  Texture2D
} from "@galacean/engine";
import { probe as dependencyProbe } from "conformance-dep";
import { assert, Case, Context } from "../harness";

declare const GameGlobal: any;
import {
  AssetType,
  averageColor,
  centerRegion,
  expectColor,
  expectTextureColor,
  GREEN,
  load,
  quad,
  RED,
  unlit
} from "./common";

/** Records the names `loadSubpackage` is called with. */
function spySubpackage(ctx: Context) {
  const calls: string[] = [];
  const original = ctx.api.loadSubpackage;
  ctx.api.loadSubpackage = (options: any) => {
    calls.push(options?.name);
    return original.call(ctx.api, options);
  };
  return { calls, restore: () => void (ctx.api.loadSubpackage = original) };
}

/** Maps `<subpackage>/<file>` to a file the Editor would have exported into that subpackage. */
function registerSubpackageAsset(ctx: Context, file: string, subpackageName: string, type: string = AssetType.Texture): void {
  ctx.engine.resourceManager.registerVirtualResources([
    { virtualPath: `${subpackageName}/${file}`, path: `public/${subpackageName}/${file}`, type, subpackageName }
  ] as any);
}

/** Renders `text` with Engine's TextRenderer and counts the lit pixels around the canvas center. */
async function textLitPixels(ctx: Context, font: Font, text: string): Promise<number> {
  const entity = ctx.root.createChild("font-text");
  const renderer = entity.addComponent(TextRenderer);
  renderer.font = font;
  renderer.fontSize = 48;
  renderer.color = new Color(1, 1, 1, 1);
  renderer.text = text;
  const region = centerRegion(ctx.engine, 0);
  const [pixels] = await ctx.capture([{ x: region.x - 200, y: region.y - 100, width: 400, height: 200 }], 4);
  entity.destroy();
  let lit = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 128) lit++;
  return lit;
}

function requirePhysics(ctx: Context): void {
  assert(ctx.physics, `PhysX is not available: ${ctx.physicsError || "engine created without physics"}`);
}

export const engineOverrideCases: Case[] = [
  {
    id: "text-renderer",
    category: "engine-override",
    title: "文字渲染（R8/Alpha8 字形）",
    covers: "TextRenderer glyph textures; WeChat: TextUtils._measureFontOrChar override",
    async run(ctx) {
      const entity = ctx.root.createChild("text");
      const text = entity.addComponent(TextRenderer);
      text.font = Font.createFromOS(ctx.engine, "Arial");
      text.fontSize = 64;
      text.color = new Color(1, 1, 1, 1);
      text.text = "Galacean 小游戏";
      const region = centerRegion(ctx.engine, 0);
      const width = Math.min(ctx.engine.canvas.width, 600);
      const [pixels] = await ctx.capture([{ x: Math.floor(region.x - width / 2), y: region.y - 60, width, height: 120 }], 4);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 128 && pixels[i + 1] > 128 && pixels[i + 2] > 128) lit++;
      const ratio = lit / (pixels.length / 4);
      assert(lit > 100, `only ${lit} lit pixels: text did not render`);
      assert(ratio < 0.6, `${(ratio * 100).toFixed(1)}% of the region is lit: glyph data looks wrong`);
      return { status: "pass", detail: `${lit} lit pixels (${(ratio * 100).toFixed(1)}%)` };
    }
  },
  {
    id: "subpackage-asset",
    category: "engine-override",
    title: "分包中的资源",
    covers: "ResourceManager._loadSubpackageAndMainAsset override → the platform's loadSubpackage",
    async run(ctx) {
      const spy = spySubpackage(ctx);
      try {
        registerSubpackageAsset(ctx, "red.png", "conf-sub");
        const texture = await load<Texture2D>(ctx.engine, "conf-sub/red.png", AssetType.Texture);
        assert(spy.calls.includes("conf-sub"), `loadSubpackage was not called (calls: ${JSON.stringify(spy.calls)})`);
        await expectTextureColor(ctx, texture, RED, 8, "subpackage texture");
      } finally {
        spy.restore();
      }
    }
  },
  {
    id: "subpackage-asset-concurrent",
    category: "engine-override",
    title: "分包资源并发加载只加载一份",
    covers: "ResourceManager._loadSubpackageAndMainAsset override: the load is registered before loadSubpackage answers",
    async run(ctx) {
      const spy = spySubpackage(ctx);
      try {
        registerSubpackageAsset(ctx, "green.png", "conf-sub");
        // Two materials that use the same texture: Engine must hand both the same object.
        const [first, second] = await Promise.all([
          load<Texture2D>(ctx.engine, "conf-sub/green.png", AssetType.Texture),
          load<Texture2D>(ctx.engine, "conf-sub/green.png", AssetType.Texture)
        ]);
        assert(
          first === second,
          `two concurrent loads created two textures (instanceId ${first.instanceId} and ${second.instanceId}; loadSubpackage calls: ${spy.calls.length})`
        );
        assert(spy.calls.length === 1, `loadSubpackage was called ${spy.calls.length} times for one asset`);
        await expectTextureColor(ctx, first, GREEN, 8, "subpackage texture");
      } finally {
        spy.restore();
      }
    }
  },
  {
    id: "subpackage-asset-failure",
    category: "engine-override",
    title: "分包加载失败后可以重试",
    covers: "ResourceManager._loadSubpackageAndMainAsset override: a failed load leaves nothing behind",
    async run(ctx) {
      const spy = spySubpackage(ctx);
      const attempt = () =>
        load(ctx.engine, "conf-missing/any.png", AssetType.Texture).then(
          () => "resolved",
          (error) => `rejected: ${String(error?.message ?? error).slice(0, 80)}`
        );
      try {
        registerSubpackageAsset(ctx, "any.png", "conf-missing");
        const first = await attempt();
        assert(first.startsWith("rejected"), `loading from a subpackage that does not exist ${first}`);
        // A stale "loading" entry would answer the second load with the first failure, without asking the platform.
        const second = await attempt();
        assert(second.startsWith("rejected"), `the second load ${second}`);
        assert(spy.calls.length === 2, `loadSubpackage was called ${spy.calls.length} times for two loads: the failure was kept`);
        return { status: "pass", detail: first };
      } finally {
        spy.restore();
      }
    }
  },
  {
    id: "subpackage-asset-cancel",
    category: "engine-override",
    title: "分包资源加载中可以取消",
    covers: "ResourceManager.cancelNotLoaded while the override waits for loadSubpackage",
    async run(ctx) {
      registerSubpackageAsset(ctx, "blue.png", "conf-sub");
      const cancelRightAfterStart = async (when: string) => {
        const pending = load(ctx.engine, "conf-sub/blue.png", AssetType.Texture).then(
          () => "resolved",
          (error) => `rejected: ${String(error?.message ?? error)}`
        );
        ctx.engine.resourceManager.cancelNotLoaded("conf-sub/blue.png");
        const outcome = await pending;
        assert(outcome === "rejected: canceled", `${when}: a canceled load ${outcome}`);
        await ctx.wait(500);
        const cached = ctx.engine.resourceManager.getFromCache("conf-sub/blue.png");
        assert(!cached, `${when}: the canceled load still loaded the texture into the cache`);
      };
      await cancelRightAfterStart("loadSubpackage answers later");
      // WeChat on Android answers at once for a subpackage that is already loaded (seen on a device; DevTools
      // answers later), so the asset is already loading when the cancel arrives. Reproduce that everywhere.
      const original = ctx.api.loadSubpackage;
      ctx.api.loadSubpackage = (options: any) => options.success?.();
      try {
        await cancelRightAfterStart("loadSubpackage answers at once");
      } finally {
        ctx.api.loadSubpackage = original;
      }
    }
  },
  {
    id: "subpackage-asset-cancel-reload",
    category: "engine-override",
    title: "取消分包资源后立即重新加载，仍然只加载一份",
    covers: "ResourceManager._loadSubpackageAndMainAsset override: the loading entry has one owner, so Engine's cleanup of a canceled load cannot remove the entry of the reload",
    async run(ctx) {
      registerSubpackageAsset(ctx, "yellow.png", "conf-sub");
      const url = "conf-sub/yellow.png";
      // The platform answers at once (WeChat on Android does for a subpackage that is already loaded), so the
      // asset is loading when the cancel arrives.
      const original = ctx.api.loadSubpackage;
      ctx.api.loadSubpackage = (options: any) => options.success?.();
      try {
        let reload: Promise<Texture2D>;
        const first = load<Texture2D>(ctx.engine, url, AssetType.Texture);
        // A game that loads the asset again when its load is rejected (a retry, or the next scene needs it too).
        const reloadStarted = new Promise<void>((resolve) =>
          first.then(undefined, () => {
            reload = load<Texture2D>(ctx.engine, url, AssetType.Texture);
            resolve();
          })
        );
        ctx.engine.resourceManager.cancelNotLoaded(url);
        await reloadStarted;
        // Let the canceled load finish its own cleanup before the next load arrives.
        for (let i = 0; i < 12; i++) await Promise.resolve();
        const next = load<Texture2D>(ctx.engine, url, AssetType.Texture);
        const [a, b] = await Promise.all([reload, next]);
        assert(a === b, `the reload and a load that arrived while it ran created two textures (instanceId ${a.instanceId} and ${b.instanceId})`);
      } finally {
        ctx.api.loadSubpackage = original;
      }
    }
  },
  {
    id: "subpackage-subasset-failure",
    category: "engine-override",
    title: "分包加载失败后不留下子资源的回调记录",
    covers: "ResourceManager._loadSubpackageAndMainAsset override: a sub-asset request (url?q=…) whose subpackage fails leaves nothing behind",
    async run(ctx) {
      const rm: any = ctx.engine.resourceManager;
      // Engine's internal tables: the callbacks of sub-asset requests, and the loads that are running.
      if (typeof rm._subAssetPromiseCallbacks !== "object" || typeof rm._loadingPromises !== "object") {
        return { status: "skip", detail: "ResourceManager._subAssetPromiseCallbacks / _loadingPromises not found" };
      }
      registerSubpackageAsset(ctx, "any.gltf", "conf-missing", AssetType.GLTF);
      const outcome = await load(ctx.engine, "conf-missing/any.gltf?q=meshes[0][0]", AssetType.GLTF).then(
        () => "resolved",
        (error) => `rejected: ${String(error?.message ?? error).slice(0, 80)}`
      );
      assert(outcome.startsWith("rejected"), `a sub-asset of a subpackage that does not exist ${outcome}`);
      const left = [...Object.keys(rm._subAssetPromiseCallbacks), ...Object.keys(rm._loadingPromises)].filter((key) => key.indexOf("any.gltf") >= 0);
      assert(left.length === 0, `the failed load left entries behind: ${JSON.stringify(left)}`);
      return { status: "pass", detail: outcome };
    }
  },
  {
    id: "texture2d-binary",
    category: "engine-override",
    title: "Galacean 二进制纹理（GLCN Texture2D）",
    covers: "Texture2DDecoder.decode; WeChat: override that declares the image type of the blob",
    async run(ctx) {
      const texture = await load<Texture2D>(ctx.engine, `${ctx.local}/red.tex.bin`, AssetType.Texture);
      await expectTextureColor(ctx, texture, RED, 8, "binary texture");
    }
  },
  {
    id: "ktx2",
    category: "engine-override",
    title: "KTX2 纹理（basis 转码）",
    covers: "KTX2Loader._parseBuffer, BinomialLLCTranscoder overrides, basis_transcoder WASM loader",
    timeout: 20000,
    async run(ctx) {
      const texture = await load<Texture2D>(ctx.engine, `${ctx.local}/red.ktx2.bin`, AssetType.KTX2);
      await expectTextureColor(ctx, texture, RED, 48, "KTX2 texture");
    }
  },
  {
    id: "font-file",
    category: "engine-override",
    title: "自定义字体文件",
    covers: "FontLoader override → wx.loadFont (no FontFace / document.fonts)",
    async run(ctx) {
      const font = await load<Font>(ctx.engine, `${ctx.local}/box-font.json`, AssetType.Font);
      assert(font && font.name, "the loaded Font has no name");
      // Platform level: does a 2D canvas draw "A" with the registered family (a solid box)?
      const canvasCoverage = (family: string) => {
        const canvas = new ctx.adapter.OffscreenCanvas(128, 128);
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext("2d");
        context.fillStyle = "#000";
        context.fillRect(0, 0, 128, 128);
        context.fillStyle = "#fff";
        context.textBaseline = "top";
        context.font = `100px "${family}"`;
        context.fillText("A", 4, 4);
        const data = context.getImageData(0, 0, 128, 128).data;
        let lit = 0;
        for (let i = 0; i < data.length; i += 4) if (data[i] > 128) lit++;
        return lit;
      };
      // Render right after loading: the loader must not resolve before the family is usable,
      // otherwise Engine caches fallback glyphs.
      const custom = await textLitPixels(ctx, font, "AB");
      const platform = canvasCoverage(font.name);
      const platformSystem = canvasCoverage("Arial");
      const system = await textLitPixels(ctx, Font.createFromOS(ctx.engine, "Arial"), "AB");
      const detail =
        `family "${font.name}"; 2D canvas "A" lit ${platform} (Arial ${platformSystem}); Engine "AB" lit ${custom} (Arial ${system})`;
      // The test font draws "A" and "B" as solid boxes, so it lights far more pixels than a system font.
      assert(custom > system * 1.5, `the custom font was not used: ${detail}`);
      return { status: "pass", detail };
    }
  },
  {
    id: "font-source",
    showDetail: true,
    category: "engine-override",
    title: "直接加载字体文件",
    covers: "SourceFontLoader override → the platform's loadFont (no FontFace / document.fonts)",
    async run(ctx) {
      const started = Date.now();
      const font = await load<Font>(ctx.engine, `${ctx.local}/source.ttf`, AssetType.SourceFont);
      const ms = Date.now() - started;
      // The font draws "s" and "y" as solid boxes, so it lights far more pixels than a system font.
      const custom = await textLitPixels(ctx, font, "sy");
      const system = await textLitPixels(ctx, Font.createFromOS(ctx.engine, "Arial"), "sy");
      const detail = `family "${font.name}"; loaded in ${ms} ms; Engine "sy" lit ${custom} (Arial ${system})`;
      assert(custom > system * 1.5, `the font was not used: ${detail}`);
      return { status: "pass", detail };
    }
  },
  {
    id: "font-subset",
    showDetail: true,
    category: "engine-override",
    title: "只含部分字符的字体（没有拉丁字符）",
    covers: "FontLoader usability wait: a font without Latin glyphs is used, and does not hold the load up",
    async run(ctx) {
      const started = Date.now();
      const font = await load<Font>(ctx.engine, `${ctx.local}/subset.ttf`, AssetType.SourceFont);
      const ms = Date.now() - started;
      // The font draws "中" as a solid box, which lights far more pixels than a system font's "中".
      const custom = await textLitPixels(ctx, font, "中");
      const system = await textLitPixels(ctx, Font.createFromOS(ctx.engine, "Arial"), "中");
      const detail = `loaded in ${ms} ms; family "${font.name}"; Engine "中" lit ${custom} (system font ${system})`;
      assert(custom > system * 1.5, `the subset font was not used: ${detail}`);
      assert(ms < 1500, `loading took ${ms} ms: the loader waited for characters the font does not have`);
      return { status: "pass", detail };
    }
  },
  {
    id: "physx-initialize",
    category: "engine-override",
    title: "PhysX 初始化（WASM 分包）",
    covers: "PhysXPhysics.initialize override, inject-wasm (await glue), WXWebAssembly",
    async run(ctx) {
      requirePhysics(ctx);
    }
  },
  {
    id: "physx-simulation",
    category: "engine-override",
    title: "PhysX 模拟：小球落地",
    covers: "PhysX simulation with Engine 2.0 colliders",
    async run(ctx) {
      requirePhysics(ctx);
      const ground = ctx.root.createChild("ground");
      ground.transform.setPosition(0, -3, 0);
      ground.addComponent(StaticCollider).addShape(new PlaneColliderShape());
      const ball = ctx.root.createChild("ball");
      ball.transform.setPosition(0, 3, 0);
      const shape = new SphereColliderShape();
      shape.radius = 0.5;
      ball.addComponent(DynamicCollider).addShape(shape);
      await ctx.wait(2000);
      const y = ball.transform.position.y;
      assert(y < 2, `ball did not fall (y = ${y.toFixed(2)})`);
      assert(y > -3.6, `ball fell through the ground (y = ${y.toFixed(2)})`);
      return { status: "pass", detail: `y = ${y.toFixed(2)}` };
    }
  },
  {
    id: "physx-mesh-collider",
    category: "engine-override",
    title: "PhysX 网格碰撞体（cooking）",
    covers: "Engine 2.0 PhysXPhysics._init cooking objects (no longer overridden)",
    async run(ctx) {
      requirePhysics(ctx);
      const ground = ctx.root.createChild("ground");
      ground.addComponent(StaticCollider).addShape(new PlaneColliderShape());
      const body = ctx.root.createChild("mesh-body");
      body.transform.setPosition(0, 2, 0);
      const shape = new MeshColliderShape();
      shape.isConvex = true;
      shape.mesh = PrimitiveMesh.createCuboid(ctx.engine, 1, 1, 1, false);
      body.addComponent(DynamicCollider).addShape(shape);
      await ctx.wait(1500);
      const y = body.transform.position.y;
      assert(y < 1.9, `convex mesh body did not move (y = ${y.toFixed(2)})`);
      // A body falls with or without a shape. Only a cooked shape stops the 1 m cube on the ground, at y = 0.5.
      assert(y > 0.3 && y < 0.7, `convex mesh body did not come to rest on the ground (y = ${y.toFixed(2)})`);
      return { status: "pass", detail: `y = ${y.toFixed(2)}` };
    }
  },
  {
    id: "audio-source",
    showDetail: true,
    category: "engine-override",
    title: "AudioClip 加载和 AudioSource 播放",
    covers: "AudioLoader._getDecodeContext override (no OfflineAudioContext), AudioSource gain (Douyin has no AudioParam.setValueAtTime)",
    async run(ctx) {
      const clip = await load<AudioClip>(ctx.engine, `${ctx.local}/tone.wav`, AssetType.Audio);
      assert(clip && clip.duration > 0.1, `clip duration ${clip?.duration}`);
      const source = ctx.root.createChild("audio").addComponent(AudioSource);
      source.volume = 0.5;
      source.clip = clip;
      // play() creates the gain node and sets its gain, but only once the audio context runs: until then
      // it waits for the context to resume, and nothing of the gain path has run.
      source.play();
      let played = source.isPlaying;
      for (let i = 0; i < 20 && !played; i++) {
        await ctx.wait(50);
        played = source.isPlaying;
      }
      if (!played) {
        return { status: "known", detail: `duration ${clip.duration.toFixed(2)}s; 播放没有开始（音频上下文没有运行，可能需要用户触摸），音量设置没有被测到` };
      }
      // The volume change sets the gain again.
      source.volume = 0.25;
      return { status: "pass", detail: `duration ${clip.duration.toFixed(2)}s; 播放已开始; 是否发声需要人工确认` };
    }
  }
];

function loadSubpackage(ctx: Context, name: string): Promise<string> {
  return new Promise((resolve) => {
    ctx.api.loadSubpackage({
      name,
      success: () => resolve("loaded"),
      fail: (error: any) => resolve(`failed: ${error?.errMsg ?? JSON.stringify(error)}`)
    });
  });
}

export const buildCases: Case[] = [
  {
    id: "subpackage-entry-script",
    category: "build",
    title: "分包入口脚本被执行",
    covers: "game.json subpackages: entry game.js under public/ (Editor layout) and at the project root",
    async run(ctx) {
      const outcomes: string[] = [];
      for (const name of ["conf-sub", "conf-sub-top"]) {
        const loaded = await loadSubpackage(ctx, name);
        const ran = ((GameGlobal as any).__conformanceSubpackages ?? []).includes(name);
        outcomes.push(`${name}: ${loaded}, entry ${ran ? "ran" : "did not run"}`);
      }
      // DevTools only: what the simulator inserted for these subpackages (its loader and the entry scripts).
      const g = GameGlobal as any;
      let inserted = "";
      try {
        const head = g.__$ownerHead ?? g.document?.head;
        inserted = Array.from(head?.querySelectorAll?.("script") ?? [])
          .map((s: any) => s.src)
          .filter((src: string) => src.includes("conf-sub"))
          .join(", ");
      } catch (error) {
        inserted = `n/a (${error})`;
      }
      const detail = `${outcomes.join("; ")}; scripts: ${inserted || "none"}; page: ${g.location?.href ?? "n/a"}`;
      assert(!detail.includes("did not run") && !detail.includes("failed"), detail);
      return { status: "pass", detail };
    }
  },
  {
    id: "simd-disabled",
    category: "build",
    title: "关闭 SIMD 检测",
    covers: "plugin-replace-simd (WXWebAssembly has no SIMD)",
    async run() {
      const detect = (SystemInfo as any)._detectSIMDSupported;
      if (typeof detect !== "function") return { status: "skip", detail: "SystemInfo._detectSIMDSupported not found" };
      assert(detect.call(SystemInfo) === false, "SIMD is reported as supported");
    }
  },
  {
    id: "dependency-web-api",
    category: "build",
    title: "第三方 npm 包中的 Web API 被改写",
    covers: "adaptDependencies → plugin-replace-webapi for non-Galacean packages",
    async run() {
      const result = dependencyProbe();
      assert(result.innerWidth > 0, `window.innerWidth in a dependency = ${result.innerWidth}`);
      assert(result.createElement, "document.createElement unavailable in a dependency");
      assert(result.requestAnimationFrame, "requestAnimationFrame unavailable in a dependency");
    }
  },
  {
    id: "user-code-web-api",
    category: "build",
    title: "用户脚本中的 Web API",
    covers: "project-builder buildProject (user code is not rewritten)",
    async run() {
      const hasWindow = typeof (globalThis as any).window !== "undefined";
      const hasDocument = typeof (globalThis as any).document !== "undefined";
      if (hasWindow && hasDocument) {
        return { status: "known", detail: "模拟器提供了全局 window 和 document，真机可能没有；用户脚本本身不会被改写" };
      }
      return {
        status: "known",
        detail: `用户脚本没有被改写：window ${hasWindow ? "有" : "无"}，document ${hasDocument ? "有" : "无"}。直接使用 Web API 的用户脚本会出错`
      };
    }
  }
];

export const engineCases: Case[] = [
  {
    id: "render-unlit",
    category: "engine",
    title: "基础渲染（Unlit）",
    covers: "WebGL context on the platform canvas, shader compile, draw",
    async run(ctx) {
      quad(ctx, unlit(ctx.engine, RED));
      const [center, corner] = await ctx.capture([centerRegion(ctx.engine), { x: 2, y: 2, width: 4, height: 4 }]);
      expectColor(center, RED, 4, "unlit quad");
      expectColor(corner, [0, 0, 0], 4, "background");
      const gl = (ctx.engine as any)._hardwareRenderer;
      return { status: "pass", detail: `WebGL${gl.isWebGL2 ? "2" : "1"}, canvas ${ctx.engine.canvas.width}×${ctx.engine.canvas.height}` };
    }
  },
  {
    id: "render-pbr",
    category: "engine",
    title: "PBR 材质和平行光",
    covers: "PBR shader compile, lighting",
    async run(ctx) {
      const light = ctx.root.createChild("light");
      light.transform.setRotation(-30, -30, 0);
      light.addComponent(DirectLight);
      const material = new PBRMaterial(ctx.engine);
      material.baseColor = new Color(1, 1, 1, 1);
      quad(ctx, material);
      const [pixels] = await ctx.capture([centerRegion(ctx.engine)]);
      const [r, g, b] = averageColor(pixels);
      assert(r + g + b > 60, `lit quad is black: rgb(${r},${g},${b})`);
    }
  },
  {
    id: "texture-png",
    category: "engine",
    title: "PNG 纹理（TextureLoader）",
    covers: "Engine 2.0 decodeImage: untyped Blob → URL.createObjectURL → Image",
    async run(ctx) {
      const texture = await load<Texture2D>(ctx.engine, `${ctx.local}/red.png`, AssetType.Texture);
      await expectTextureColor(ctx, texture, RED, 8, "PNG texture");
    }
  },
  {
    id: "texture-remote",
    remote: true,
    category: "engine",
    title: "远程 PNG 纹理",
    covers: "TextureLoader over http → XMLHttpRequest → wx.request",
    async run(ctx) {
      const texture = await load<Texture2D>(ctx.engine, `${ctx.remote}/red.png`, AssetType.Texture);
      await expectTextureColor(ctx, texture, RED, 8, "remote PNG texture");
    }
  },
  {
    id: "sprite",
    category: "engine",
    title: "Sprite 渲染",
    covers: "SpriteRenderer with a loaded texture",
    async run(ctx) {
      const texture = await load<Texture2D>(ctx.engine, `${ctx.local}/red.png`, AssetType.Texture);
      const entity = ctx.root.createChild("sprite");
      entity.transform.setScale(100, 100, 1);
      entity.addComponent(SpriteRenderer).sprite = new Sprite(ctx.engine, texture);
      const [pixels] = await ctx.capture([centerRegion(ctx.engine)]);
      expectColor(pixels, RED, 8, "sprite");
    }
  },
  {
    id: "loader-json-text-buffer",
    category: "engine",
    title: "JSON、Text、Buffer 加载器",
    covers: "ResourceManager request → XMLHttpRequest local path",
    async run(ctx) {
      // Engine 2.0 wraps loaded data in JSONAsset, TextAsset and BufferAsset.
      const json = await load<any>(ctx.engine, `${ctx.local}/data.json`, AssetType.JSON);
      assert(json?.data?.n === 42, `JSONAsset.data ${JSON.stringify(json?.data)}`);
      const text = await load<any>(ctx.engine, `${ctx.local}/text.txt`, AssetType.Text);
      assert(text?.text === "Galacean 小游戏", `TextAsset.text ${JSON.stringify(text?.text)}`);
      const buffer = await load<any>(ctx.engine, `${ctx.local}/data.bin`, AssetType.Buffer);
      assert(buffer?.buffer?.byteLength === 256, `BufferAsset.buffer length ${buffer?.buffer?.byteLength}`);
    }
  },
  {
    id: "gltf-external-buffer",
    category: "engine",
    title: "glTF（外部 .bin）",
    covers: "GLTFLoader with an external buffer, KHR_materials_unlit",
    async run(ctx) {
      const gltf = await load<GLTFResource>(ctx.engine, `${ctx.local}/quad.gltf`, AssetType.GLTF);
      ctx.root.addChild(gltf.instantiateSceneRoot());
      const [pixels] = await ctx.capture([centerRegion(ctx.engine)]);
      expectColor(pixels, RED, 8, "glTF quad");
    }
  },
  {
    id: "gltf-data-uri",
    category: "engine",
    title: "glTF（base64 内嵌 buffer）",
    covers: "GLTFLoader data URI buffers → XMLHttpRequest data URL (adapter DataURL decoding)",
    async run(ctx) {
      const gltf = await load<GLTFResource>(ctx.engine, `${ctx.local}/quad-embedded.gltf`, AssetType.GLTF);
      ctx.root.addChild(gltf.instantiateSceneRoot());
      const [pixels] = await ctx.capture([centerRegion(ctx.engine)]);
      expectColor(pixels, RED, 8, "embedded glTF quad");
    }
  },
  {
    id: "buffer-data-url",
    category: "engine",
    title: "Buffer（base64 data URL）",
    covers: "BufferLoader base64 data URL → platformAdapter.atob (the only atob call in Engine)",
    async run(ctx) {
      const asset: any = await load(ctx.engine, "data:application/octet-stream;base64,AAECA/8=", AssetType.Buffer);
      const bytes = Array.from(new Uint8Array(asset.buffer));
      assert(bytes.join(",") === "0,1,2,3,255", `decoded bytes: ${bytes.join(",")}`);
    }
  },
  {
    id: "mesh-renderer-count",
    category: "engine",
    title: "多个渲染器同时绘制",
    covers: "batched draws on the platform WebGL context",
    async run(ctx) {
      for (let i = 0; i < 50; i++) {
        const entity = ctx.root.createChild(`cube-${i}`);
        entity.transform.setPosition((i % 10) - 4.5, Math.floor(i / 10) - 2, 0);
        const renderer = entity.addComponent(MeshRenderer);
        renderer.mesh = PrimitiveMesh.createCuboid(ctx.engine, 0.5, 0.5, 0.5);
        renderer.setMaterial(unlit(ctx.engine, RED));
      }
      await ctx.capture([centerRegion(ctx.engine)]);
    }
  }
];

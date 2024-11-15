import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import gulp from 'gulp';
import buffer from 'vinyl-buffer';
import source from 'vinyl-source-stream';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import debug from 'gulp-debug';
import rollup from '@rollup/stream';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import chalk from 'chalk';
import yargs from 'yargs';

import inject from './plugins/plugin-inject-global.js';
import { walk } from 'estree-walker';
import { generate } from 'escodegen';

import { getPlatformsFromPath, normalizePath } from './utils/utils.js';

import { Environment, TargetPlatform } from './cli.js';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const Platform_GlobalVars_Map = {
  'alipay': 'global',
  'wechat': 'GameGlobal',
};

const GE_REF_API_LIST = [
  'URL',
  'Blob',
  'window',
  'document',
  'TextDecoder',
  'XMLHttpRequest',
  'OffscreenCanvas',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'Image',

  'atob',
  'navigator',
  'performance',
  'cancelAnimationFrame',
  'requestAnimationFrame',
  '$defaultWebGLExtensions',
  'fonts',
  'URLSearchParams'
];

function replaceSIMDSupportedWX(node, code) {
  // 微信基础库从2.16版本开始删除了原生WebAssembly的支持, WXWebAssembly不支持部分api以及SIMD, 且不支持远程加载wasm, 必须使用local wasm
  // https://developers.weixin.qq.com/community/develop/doc/000e2c019f8a003d5dfbb54c251c00?jumpto=comment&commentid=000eac66934960576d0cb1a7256c
  if (node.type === "AssignmentExpression" &&
    node.left.type === "MemberExpression" &&
    node.left.object.type === "ThisExpression" &&
    node.left.property.name === "_simdSupported" &&
    node.right.type === "CallExpression" &&
    node.right.type === "CallExpression" &&
    (node.right.callee.object.name === "WebAssembly" || node.right.callee.object.name === "WXWebAssembly") &&
    node.right.callee.property.name === "validate") {
    // 构造新的赋值表达式节点
    const newAssignment = {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        object: {
          type: "ThisExpression"
        },
        property: {
          type: "Identifier",
          name: "_simdSupported"
        }
      },
      right: {
        type: "Literal", // 使用 Literal 表示一个字面量
        value: false  // 设置字面量的值为 false
      } // 将原始调用表达式作为赋值的右侧
    }
    return code.replace(code.slice(node.start, node.end), generate(newAssignment));
  }
  return code;
}

function replaceGalaceanAPI() {
  return {
    name: 'patchGalacean',
    transform(code, filePath) {
      if (filePath.indexOf('@galacean') > -1) {
        code = code.replace(
          `gl[_glKey] = extensionVal;`,
          `try { gl[_glKey] = extensionVal; } catch (e) { console.error(e); }`,
        );
        code = code.replace(
          `this._requireResult = {};`,
          `this._requireResult = Object.assign({}, $defaultWebGLExtensions)`,
        );

        const ast = this.parse(code);
        walk(ast, {
          enter(node) {
            code = replaceSIMDSupportedWX(node, code);
          }
        });

        code = code.replace(/WebAssembly/g, `WXWebAssembly`);
      }
      return { code, map: null };
    }
  };
}

function rebuildGEPlugin(entry, injectName, injectNamePostfix, apiList) {
  return [
    replaceGalaceanAPI(),
    inject({
      modules: apiList.reduce((acc, curr) => {
        const injectSetting = {
          globalVarName: entry,
          localName: injectName,
          localNamePostfix: injectNamePostfix.concat(`.${curr}`),
          overwrite: true,
        };

        acc[curr] = injectSetting;
        acc[`self.${curr}`] = injectSetting;

        return acc;
      }, {}),
    }),
  ];
}

async function bundleGECore(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine/dist/module.js`));
  async function bundleModule(platform, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, rebuildGEPlugin(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST));
  }

  const { target: targetPlatform } = argv;
  if (targetPlatform == TargetPlatform.All) {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        continue;
      }
      await bundleModule(platform, needUglify);
    }
  } else {
    if (platforms.includes(targetPlatform)) {
      if (targetPlatform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        return;
      }
      await bundleModule(targetPlatform, needUglify);
    }
  }
}

async function bundleGEPhysicsLite(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-physics-lite/dist/module.js`));
  async function bundleModule(platform, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-physics-lite.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, rebuildGEPlugin(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST));
  }

  const { targetPlatform } = argv;
  if (targetPlatform == TargetPlatform.All) {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        continue;
      }
      await bundleModule(platform, needUglify);
    }
  } else {
    if (platforms.includes(targetPlatform)) {
      if (targetPlatform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        return;
      }
      await bundleModule(targetPlatform, needUglify);
    }
  }
}

async function bundleGESpine(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-spine/dist/module.js`));
  async function bundleModule(platform, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-spine.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, rebuildGEPlugin(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST));
  }

  const { targetPlatform } = argv;
  if (targetPlatform == TargetPlatform.All) {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        continue;
      }
      await bundleModule(platform, needUglify);
    }
  } else {
    if (platforms.includes(targetPlatform)) {
      if (targetPlatform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        return;
      }
      await bundleModule(targetPlatform, needUglify);
    }
  }
}

async function bundleGEShaderLab(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-shader-lab/dist/module.js`));
  async function bundleModule(platform, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-shader-lab.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, rebuildGEPlugin(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST));
  }

  const { targetPlatform } = argv;
  if (targetPlatform == TargetPlatform.All) {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        continue;
      }
      await bundleModule(platform, needUglify);
    }
  } else {
    if (platforms.includes(targetPlatform)) {
      if (targetPlatform === 'alipay') {
        // Jump over alipay, before the adapter is ready
        return;
      }
      await bundleModule(targetPlatform, needUglify);
    }
  }
}

function createBundleTask(argv, src, dst, needUglify, targets, plugins) {
  const { env } = argv;

  const targetFileName = path.basename(dst);
  dst = path.dirname(dst);
  let task = rollup({
    input: src,
    output: targets ? targets : {},
    plugins: [
      resolve(),
      commonjs(),
      ...plugins,
    ],
    external: ['@galacean/engine']
  })
  .pipe(source(targetFileName))
  .pipe(buffer());

  if (env === Environment.Production && needUglify) {
    task = task.pipe(uglify());
  }
  task = task.pipe(gulp.dest(dst));
  return task;
}

async function bundle(argv, entry, output, needUglify, targets = {}, plugins = []) {
  await new Promise((resolve) => {
    createBundleTask(argv, entry, output, needUglify, targets, plugins).on('end', resolve);
  });
}

(async function bundleEngine() {
  try {
    const argv = yargs(process.argv)
    .option('env', {
      default: Environment.Production,
      type: 'string'
    })
    .option('target', {
      default: TargetPlatform.All,
      type: 'string'
    })
    .argv;

    console.time('Bundle engine of wechat platform');
    await bundleGECore(argv);
    console.timeEnd('Bundle engine of wechat platform');
    console.time('Bundle physics-lite engine of wechat platform');
    await bundleGEPhysicsLite(argv);
    console.timeEnd('Bundle physics-lite engine of wechat platform');
    console.time('Bundle shader-lab of wechat platform');
    await bundleGEShaderLab(argv);
    console.timeEnd('Bundle shader-lab of wechat platform');
    console.time('Bundle spine engine of wechat platform');
    await bundleGESpine(argv);
    console.timeEnd('Bundle spine engine of wechat platform');

    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}());

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

import { getPlatformsFromPath, normalizePath } from './utils/utils.js';
import { Environment, TargetPlatform } from './cli.js';
import { replaceAPICaller, replaceGalaceanLogic, injectGalaceanImports } from './plugins/plugin-replace-engine.js';

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

async function bundleGECore(argv: any) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine/dist/module.js`));
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, [replaceGalaceanLogic(), replaceAPICaller(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST), injectGalaceanImports()]);
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

async function bundleGEPhysicsLite(argv: any) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-physics-lite/dist/module.js`));
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-physics-lite.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, [replaceGalaceanLogic(), replaceAPICaller(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST), injectGalaceanImports()]);
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

async function bundleGESpine(argv: any) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-spine/dist/module.js`));
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-spine.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, [replaceGalaceanLogic(), replaceAPICaller(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST), injectGalaceanImports()]);
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

async function bundleGEShaderLab(argv: any) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engines, including: ${platforms}`));

  let needUglify = true;
  let builtinEntry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-shader-lab/dist/module.js`));
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    let builtinGlobalEntry = Platform_GlobalVars_Map[platform];
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-shader-lab.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify, { format: 'cjs', }, [replaceGalaceanLogic(), replaceAPICaller(builtinGlobalEntry, '.platformAdapter', ``, GE_REF_API_LIST), injectGalaceanImports()]);
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

/**
 * @param argv Command line arguments, e.g. default is { env: 'release', target: 'all' }
 * @param src The path of the input file
 * @param dst Path of the output file, contains the file's name
 * @param needUglify Need to uglify the output
 * @param targets Some key-value pairs of rollup output config, e.g. { format: 'cjs' }
 * @param plugins Array of rollup plugins
 * @returns 
 */
function createBundleTask(argv: any, src: string, dst: string, needUglify: boolean, targets = {}, plugins = []) {
  const { env } = argv;

  const targetFileName = path.basename(dst);
  dst = path.dirname(dst);
  let task = rollup({
    input: src,
    output: targets ? targets : {},
    plugins: [
      resolve(),
      commonjs({
        requireReturnsDefault: 'preferred'
      }),
      ...plugins,
    ],
    external: ['@galacean/engine']
  })
  .pipe(source(targetFileName))
  .pipe(buffer());

  if (env === Environment.Release && needUglify) {
    task = task.pipe(uglify());
  }
  task = task.pipe(gulp.dest(dst));
  return task;
}

/**
 * @param argv Command line arguments, e.g. default is { env: 'release', target: 'all' }
 * @param entry The path of the input file
 * @param output Path of the output file, contains the file's name
 * @param needUglify Need to uglify the output
 * @param targets Some key-value pairs of rollup output config, e.g. { format: 'cjs' }
 * @param plugins Array of rollup plugins
 * @returns 
 */
async function bundle(argv, entry, output, needUglify, targets = {}, plugins = []) {
  await new Promise((resolve) => {
    createBundleTask(argv, entry, output, needUglify, targets, plugins).on('end', resolve);
  });
}

(async function bundleEngine() {
  try {
    const argv = yargs(process.argv)
    .option('env', {
      default: Environment.Release,
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

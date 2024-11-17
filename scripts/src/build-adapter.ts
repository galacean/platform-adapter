import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import gulp from 'gulp';
import buffer from 'vinyl-buffer';
import source from 'vinyl-source-stream';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import debug from 'gulp-debug';
import rollup from '@rollup/stream';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import ts from '@rollup/plugin-typescript';
import chalk from 'chalk';
import yargs from 'yargs';

import { getPlatformsFromPath, normalizePath } from './utils/utils.js';

import { Environment, TargetPlatform } from './cli.js';

// Get current directory
// @ts-ignore
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '../..');

async function bundleMinigameAdapter(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame adapters, including: ${platforms}`));

  let needUglify = true;
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    // bundle platform-adapter.js
    let builtinEntry = normalizePath(path.join(platformsPath, `${platform}/builtin/src/index.ts`));
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/platform-adapter.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify);
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

async function bundleMinigameEngineAdapter(argv) {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame engine adapters, including: ${platforms}`));

  let needUglify = true;
  async function bundleModule(platform: string, needUglify = true) {
    console.log(`handling platform ${chalk.green(platform)}`);

    // bundle platform-adapter.js
    let builtinEntry = normalizePath(path.join(platformsPath, `${platform}/engine/index.ts`));
    let builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/engine-adapter.js`));
    await bundle(argv, builtinEntry, builtinOutput, needUglify);
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
 * @returns 
 */
function createBundleTask(argv: any, src: string, dst: string, needUglify: boolean, targets = {}) {
  const { env } = argv;

  const targetFileName = path.basename(dst);
  dst = path.dirname(dst);
  let task = rollup({
    input: src,
    output: targets ? targets : {},
    plugins: [
      ts(),
      resolve(),
      commonjs(),
    ],
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
 * @returns 
 */
async function bundle(argv: any, entry: string, output: string, needUglify: boolean, targets = {}) {
  await new Promise((resolve) => {
    createBundleTask(argv, entry, output, needUglify, targets).on('end', resolve);
  });
}

(async function bundleAdapter() {
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

    console.time('Bundle minigame adapter');
    await bundleMinigameAdapter(argv);
    console.timeEnd('Bundle minigame adapter');
    console.time('Bundle minigame engine adapter');
    await bundleMinigameEngineAdapter(argv);
    console.timeEnd('Bundle minigame engine adapter');

    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}());

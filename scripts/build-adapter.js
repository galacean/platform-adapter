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

import { getPlatformsFromPath, normalizePath } from './utils/utils.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..');

async function bundleMinigamePlatformGlobal() {
  const platformsPath = path.join(rootDir, 'src/global/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling platform-global, including: ${platforms}`));

  let entry, output, needUglify = true;
  for (const platform of platforms) {
    if (platform === 'alipay') {
      // Jump over alipay, before the adapter is ready
      continue;
    }
    console.log(`handling platform ${chalk.green(platform)}`);

    entry = normalizePath(path.join(platformsPath, `${platform}/index.ts`));
    output = normalizePath(path.join(rootDir, `dist/minigame/${platform}/platform-global.js`));
    await bundle(entry, output, needUglify);
  }
}


async function bundleMinigameAdapter() {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame adapters, including: ${platforms}`));

  let builtinEntry, builtinOutput, needUglify = true;
  for (const platform of platforms) {
    if (platform === 'alipay') {
      // Jump over alipay, before the adapter is ready
      continue;
    }
    console.log(`handling platform ${chalk.green(platform)}`);

    // bundle platform-adapter.js
    builtinEntry = normalizePath(path.join(platformsPath, `${platform}/builtin/src/index.ts`));
    builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/platform-adapter.js`));
    await bundle(builtinEntry, builtinOutput, needUglify);
  }
}

function createBundleTask(src, dst, needUglify, targets) {
  const targetFileName = path.basename(dst);
  const targetFileNameMin = `${path.basename(targetFileName, '.js')}.min.js`;
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
  .pipe(buffer())
  .pipe(gulp.dest(dst))
  .pipe(rename(targetFileNameMin));

  if (needUglify) {
    task = task.pipe(uglify());
  }
  task = task.pipe(gulp.dest(dst));
  return task;
}

async function bundle(entry, output, needUglify, targets = {}) {
  await new Promise((resolve) => {
    createBundleTask(entry, output, needUglify, targets).on('end', resolve);
  });
}

(async function bundleAdapter() {
  try {
    console.time('Bundle platform global');
    await bundleMinigamePlatformGlobal();
    console.timeEnd('Bundle platform global');
    console.time('Bundle minigame adapter');
    await bundleMinigameAdapter();
    console.timeEnd('Bundle minigame adapter');
    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}());

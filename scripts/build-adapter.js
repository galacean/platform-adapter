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

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..');

function normalizePath (path) {
  return path.replace(/\\/g, '/');
}

async function bundlePlatformGlobal() {
  const platformGlobalPath = path.join(rootDir, 'src/global');
  console.log(chalk.green(`Bundling platform-global`));

  let entry = normalizePath(path.join(platformGlobalPath, `index.ts`));
  let output = normalizePath(path.join(rootDir, `dist/global/platform-global.js`));
  await bundle(entry, output, true);
}

/**
 * @param path
 * @returns platforms name
 */
function getPlatformsFromPath (path) {
  let platforms = fs.readdirSync(path);
  platforms = platforms.filter((p) => !p.startsWith('.'));
  return platforms;
}

async function bundleMinigameAdapter() {
  const platformsPath = path.join(rootDir, 'src/platforms/minigame');
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Bundling minigame adapters, including: ${platforms}`));

  for (const platform of platforms) {
    console.log(`handling platform ${chalk.green(platform)}`);

    const needUglify = (platform !== 'xiaomi');

    // bundle platform-adapter.js
    let builtinEntry = normalizePath(path.join(rootDir, `src/platforms/minigame/${platform}/builtin/src/index.ts`));
    if (platform === 'alipay') {
      continue;
    }
    const builtinOutput = normalizePath(path.join(rootDir, `dist/minigame/${platform}/platform-adapter.js`));
    await bundle(builtinEntry, builtinOutput, needUglify);
  }
}

function createBundleTask(src, dst, needUglify, targets) {
  const targetFileName = path.basename(dst);
  const targetFileNameMin = `${path.basename(targetFileName, '.js')}.min.js`;
  dst = path.dirname(dst);
  let task = rollup({
    input: src,
    output: targets ? targets : undefined,
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

  if (needUglify && !targets) {
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
    await bundlePlatformGlobal();
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

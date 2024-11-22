import path from 'path';
import gulp from 'gulp';
import buffer from 'vinyl-buffer';
import source from 'vinyl-source-stream';
import uglify from 'gulp-uglify';
import rollup from '@rollup/stream';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import chalk from 'chalk';

import { BundleInfo } from './BundleInfo.js';
import { getMinigameAdapterBundle, getGalaceanAdapterBundle } from "./AdapterBundle.js";
import { getEngineBundle, getLitePhysicsBundle, getPhysXPhysicsBundle, getShaderLabBundle, getSpineBundle, getToolkitBundle } from './EngineBundle.js';

export type BundleTaskType = 'PlatformAdapter' | 'GalaceanAdapter' | 'Engine';

export class BundleTask {
  public taskType: BundleTaskType;
  protected bundles: BundleInfo[];

  constructor(taskType: BundleTaskType, bundles: BundleInfo | BundleInfo[]) {
    this.taskType = taskType;
    Array.isArray(bundles) ? this.bundles = bundles : this.bundles = [bundles];
  }

  async createTask(bundle: BundleInfo): Promise<void> {
    const targetFileName = path.basename(bundle.output);
    const targetDirection = path.dirname(bundle.output);
    let rollupPlugins: any[] = bundle.rollupPlugins ?? [];

    let task = rollup({
      input: bundle.entry,
      output: bundle.rollupOutput ?? { format: 'cjs' },
      plugins: [
        resolve(),
        commonjs(),
        ...rollupPlugins
      ],
    })
    .pipe(source(targetFileName))
    .pipe(buffer());

    bundle.needUglify && (task = task.pipe(uglify()));

    task = task.pipe(gulp.dest(targetDirection));
    return new Promise((resolve) => {
      task.on('end', resolve);
      task.on('error', (err) => { throw err; });
    });
  }

  async run() {
    console.log(chalk.magenta(`Start bundle ${this.taskType}.`));
    console.time(chalk.magenta(`Bundling ${this.taskType} complete, total time`));
    await Promise.all(this.bundles.map(async (bundle) => {
      let bundleName = bundle.bundleName;
      let bundleType = bundle.bundleType ?? 'Unknown';
      let platformName = bundle.platformName;
      let platformType = bundle.platformType;
      console.log(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${platformType}: ${bundleName}`));
      console.time(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${platformType}: ${bundleName} complete, cost time`));
      return this.createTask(bundle).then(() => {
        console.timeEnd(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${platformType}: ${bundleName} complete, cost time`));
      });
    }));
    console.timeEnd(chalk.magenta(`Bundling ${this.taskType} complete, total time`));
  }
}

export default class BundleTaskFactory {
  static createBundleTask(taskType: BundleTaskType[]): BundleTask[] {
    function getBundleInfo(taskType: string): BundleTask | BundleTask[] {
      switch (taskType) {
        case 'PlatformAdapter':
          return new BundleTask(taskType, getMinigameAdapterBundle('minigame'));
        case 'GalaceanAdapter':
          return new BundleTask(taskType, getGalaceanAdapterBundle('minigame'));
        case 'Engine':
          return new BundleTask(taskType, [ ...getEngineBundle('minigame'), ...getLitePhysicsBundle('minigame'), ...getPhysXPhysicsBundle('minigame'), ...getShaderLabBundle('minigame'), ...getSpineBundle('minigame'), ...getToolkitBundle('minigame') ])
      }
    }

    return taskType.reduce((acc, cur) => {
      let tasks = getBundleInfo(cur);
      if (tasks instanceof BundleTask) {
        tasks = [tasks];
      }
      acc.push(...tasks);
      return acc;
    }, [] as BundleTask[]);
  }
}

import path from 'path';
import fs from 'fs';
import { rollup } from 'rollup';
import { swc, minify } from 'rollup-plugin-swc3';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import chalk from 'chalk';

import { BundleInfo } from './BundleInfo.js';
import { getMinigameAdapterBundle } from "./AdapterBundle.js";
import { getEngineBundle } from './EngineBundle.js';
import { rootDir } from '../cli.js';
import RebuildPlugin from '../plugins/plugin-rebuild-engine.js';

export type BundleTaskType = 'PlatformAdapter' | 'Engine';

export class BundleTask {
  public taskType: BundleTaskType;
  protected bundles: BundleInfo[];

  constructor(taskType: BundleTaskType, bundles: BundleInfo | BundleInfo[]) {
    this.taskType = taskType;
    Array.isArray(bundles) ? this.bundles = bundles : this.bundles = [bundles];
  }

  async createTask(bundle: BundleInfo, resolved?: () => void) {
    await rollup({
      input: bundle.entry,
      output: bundle.output,
      plugins: [
        resolve(),
        commonjs(),
        ...(bundle.rollupPlugins || []),
        swc(),
        bundle.needUglify && minify(),
      ]
    }).then(async (bundled) => {
      await bundled.write(bundle.output);
      await bundled.close();
      resolved && resolved();
    }).catch((err) => {
      throw err;
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
      return this.createTask(bundle, () => {
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
          return new BundleTask(taskType, getMinigameAdapterBundle('polyfill', 'minigame'));
        case 'Engine':
          const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts/package.json'), 'utf-8'));
          const bundles = Object.keys(packageJson['peerDependencies']);
          const result = bundles.map((bundle) => {
            return getEngineBundle(bundle, 'minigame');
          }).flat();
          return new BundleTask(taskType, result);
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

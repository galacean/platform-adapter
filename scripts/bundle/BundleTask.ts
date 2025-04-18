import * as fs from 'fs';
import { rollup } from 'rollup';
import { swc, minify } from 'rollup-plugin-swc3';
import chalk from 'chalk';

import { BundleInfo } from './BundleInfo.js';
import { getPolyfillBundle } from './PolyfillBundle.js';
import { getEngineBundle, getJSWASMLoaderBundle, getWasmOutputs } from './EngineBundle.js';

export interface BundleTaskSettings {
  polyfill: boolean,
  engine: string[],
  wasm: string[],
  jsWASMLoader: string[],
  output?: string,
  outputDir?: string
}

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
  static isArray(arr: any[]) {
    return arr && arr.length > 0;
  }

  static createBundleTask(bundleTaskSettings?: BundleTaskSettings): BundleTask[] {
    function getBundleInfo(taskType: string): BundleTask | BundleTask[] {
      switch (taskType) {
        case 'polyfill':
          if (bundleTaskSettings.polyfill) {
            return [
              new BundleTask('PlatformAdapter', getPolyfillBundle('polyfill', 'minigame', bundleTaskSettings.output)),
              new BundleTask('PlatformAdapter', getPolyfillBundle('polyfill', 'miniprogram', bundleTaskSettings.output)),
            ];
          }
          return undefined;
        case 'engine':
          if (BundleTaskFactory.isArray(bundleTaskSettings.engine)) {
            let result = bundleTaskSettings.engine.flatMap((engine) => {
              return [
                getEngineBundle(engine, 'minigame', bundleTaskSettings.output),
                getEngineBundle(engine, 'miniprogram', bundleTaskSettings.output),
              ].flat();
            });
            return new BundleTask('Engine', result);
          }
          return undefined;
        case 'wasm':
          if (BundleTaskFactory.isArray(bundleTaskSettings.wasm)) {
            const output = bundleTaskSettings.output;
            bundleTaskSettings.wasm.flatMap((wasm) => {
              const lastIndex = wasm.lastIndexOf('/');
              const bundleName = wasm.substring(lastIndex == -1 ? 0 : lastIndex + 1, wasm.length);
              const outputs = [
                getWasmOutputs(wasm, 'minigame', output),
                getWasmOutputs(wasm, 'miniprogram', output)
              ].flat();
              for (const output of outputs) {
                const outputFile = `${output}/${bundleName}`;
                console.log(`copy file ${wasm} to ${outputFile}`);
                fs.stat(output, (err, stats) => {
                  if (err) {
                    if (err.code === "ENOENT") {
                      fs.mkdir(output, {recursive: true}, (err) => {
                        if (err) {
                          console.log(`copy file error: ${err}`);
                        } else {
                          fs.copyFile(wasm, outputFile, (err) => {
                            if (err) {
                              console.log(`copy file error: ${err}`);
                            } else {
                              console.log(`copy file ${wasm} to ${outputFile} success`);
                            }
                          });
                        }
                      })
                    } else {
                      console.log(`copy file error: ${err}`);
                    }
                  } else {
                    fs.copyFile(wasm, outputFile, (err) => {
                      if (err) {
                        console.log(`copy file error: ${err}`);
                      } else {
                        console.log(`copy file ${wasm} to ${outputFile} success`);
                      }
                    });
                  }
                });
              }
            });
          }
          return undefined;
        case 'jsWASMLoader':
          if (BundleTaskFactory.isArray(bundleTaskSettings.jsWASMLoader)) {
            let result = bundleTaskSettings.jsWASMLoader.flatMap((loader) => {
              return getJSWASMLoaderBundle(loader, 'minigame', bundleTaskSettings.output);
            });
            return new BundleTask('Engine', result);
          }
          return undefined;
        default:
          return undefined;
      }
    }

    if (!bundleTaskSettings) {
      return undefined;
    }

    return Object.keys(bundleTaskSettings).reduce((acc, cur) => {
      let tasks = getBundleInfo(cur);
      if (tasks) {
        acc.push(tasks);
      }
      return acc;
    }, []).flat();
  }
}

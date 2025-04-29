import * as fs from 'fs';
import { rollup } from 'rollup';
import swc from '@rollup/plugin-swc';
import chalk from 'chalk';
import minify from 'minify/index.js';

import { BundleInfo, AppType, Platform, AppDefination } from './BundleInfo.js';
import { getPolyfillBundle } from "./PolyfillBundle.js";
import { getEngineBundle, getJSWASMLoaderBundle, getWasmOutputs } from './EngineBundle.js';
import { getDependencyBundle } from './DependencyBundle.js';

export interface BundleTaskSettings {
  polyfill: boolean,
  engine: string[],
  wasm: string[],
  jsWASMLoader: string[],
  root?: string,
  output?: string,
  outputDir?: string,
  dependency?: string[],
  platform?: Platform,
  app?: AppType,
  sourcemap?: boolean,
  minify?: boolean,
}

export type BundleTaskType = 'PlatformAdapter' | 'Engine' | 'Dependency';

export class BundleTask {
  public taskType: BundleTaskType;
  protected bundles: BundleInfo[];

  constructor(taskType: BundleTaskType, bundles: BundleInfo | BundleInfo[]) {
    this.taskType = taskType;
    Array.isArray(bundles) ? this.bundles = bundles : this.bundles = [bundles];
  }

  async createTask(params: { bundle: BundleInfo, bundleSettings: BundleTaskSettings }, resolved?: () => void) {
    const { bundle, bundleSettings } = params;
    await rollup({
      input: bundle.entry,
      plugins: [
        ...(bundle.rollupPlugins || []),
        swc({
          swc: {
            swcrc: false,
            jsc: {
              target: 'esnext',
              parser: {
                syntax: 'typescript',
                decorators: true,
              },
            },
          },
        }),
        !!bundleSettings.minify && minify({
          sourceMap: !!bundleSettings.sourcemap
        })
      ],
      onwarn(warning) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        console.warn(warning.message);
      }
    }).then(async (bundled) => {
      await bundled.write({
        sourcemap: !!bundleSettings.sourcemap,
        ...bundle.output,
      });
      await bundled.close();
      resolved && resolved();
    }).catch((err) => {
      throw err;
    });
  }

  async run(settings: BundleTaskSettings) {
    console.log(chalk.magenta(`Start bundle ${this.taskType}.`));
    console.time(chalk.magenta(`Bundling ${this.taskType} complete, total time`));
    await Promise.all(this.bundles.map(async (bundle) => {
      let bundleName = bundle.bundleName;
      let bundleType = bundle.bundleType ?? 'Unknown';
      let platformName = bundle.platformName;
      let appType = bundle.app;
      console.log(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${appType}: ${bundleName}`));
      console.time(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${appType}: ${bundleName} complete, cost time`));
      return this.createTask({ bundle, bundleSettings: settings }, () => {
        console.timeEnd(chalk.blue(`Bundling [${bundleType}] for ${platformName}/${appType}: ${bundleName} complete, cost time`));
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
          const polyfill = bundleTaskSettings.polyfill;
          if (polyfill) {
            const { platform, app, root, output } = bundleTaskSettings;
            if (app === 'all') {
              return AppDefination.map(appType => {
                return new BundleTask('PlatformAdapter', getPolyfillBundle('polyfill', platform, appType, root, output));
              });
            }
            return new BundleTask('PlatformAdapter', getPolyfillBundle('polyfill', platform, app, root, output));
          }
          return undefined;
        case 'engine':
          const engine = bundleTaskSettings.engine;
          if (BundleTaskFactory.isArray(engine)) {
            const { platform, app, root, output } = bundleTaskSettings;
            let result = engine.flatMap((engine) => {
              if (app === 'all') {
                return AppDefination.map(appType => {
                  return getEngineBundle(engine, platform, appType, root, output);
                }).flat();
              }
              return getEngineBundle(engine, platform, app, root, output);
            });
            return new BundleTask('Engine', result);
          }
          return undefined;
        case 'wasm':
          const wasm = bundleTaskSettings.wasm;
          if (BundleTaskFactory.isArray(wasm)) {
            const { platform, app, root, output } = bundleTaskSettings;
            wasm.flatMap((wasm) => {
              const lastIndex = wasm.lastIndexOf('/');
              const bundleName = wasm.substring(lastIndex == -1 ? 0 : lastIndex + 1, wasm.length);
              let outputs: string[] = undefined;
              if (app === 'all') {
                outputs = AppDefination.map(appType => {
                  return getWasmOutputs(wasm, platform, appType, root, output);
                }).flat();
              } else {
                outputs = getWasmOutputs(wasm, platform, app, root, output);
              }
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
          const jsWASMLoader = bundleTaskSettings.jsWASMLoader;
          if (BundleTaskFactory.isArray(bundleTaskSettings.jsWASMLoader)) {
            const { platform, app, root, output } = bundleTaskSettings;
            let result = jsWASMLoader.flatMap((loader) => {
              if (app === 'all') {
                return AppDefination.map(appType => {
                  return getJSWASMLoaderBundle(loader, platform, appType, root, output);
                }).flat();
              }
              return getJSWASMLoaderBundle(loader, platform, app, root, output);
            });
            return new BundleTask('Engine', result);
          }
          return undefined;
        case 'dependency':
          const dependency = bundleTaskSettings.dependency;
          if (BundleTaskFactory.isArray(dependency)) {
            const { platform, app, root, output } = bundleTaskSettings;
            let result = dependency.flatMap((dependency) => {
              if (app === 'all') {
                return AppDefination.map(appType => {
                  return getDependencyBundle(dependency, platform, appType, root, output);
                }).flat();
              }
              return getDependencyBundle(dependency, platform, app, root, output);
            });
            return new BundleTask('Dependency', result);
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

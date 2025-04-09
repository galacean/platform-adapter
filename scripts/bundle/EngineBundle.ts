import path from "path";
import chalk from "chalk";
import fs from 'fs';

import resolve from '@rollup/plugin-node-resolve';
import { BundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getOutputDir, getPlatformsFromPath, getScriptsFromPath, normalizePath } from "../utils/Utils.js";
import { pluginReplaceGalaceanLogic } from '../plugins/plugin-replace-engine.js';
import { pluginReplaceWebAPI } from "../plugins/plugin-replace-webapi.js";
import { pluginReplaceSIMDSupported } from "../plugins/plugin-replace-simd.js";
import ts from "typescript";
import RebuildPlugin from "../plugins/plugin-rebuild-engine.js";
import { injectWASM } from "../plugins/plugin-inject-wasm.js";

import { globalDefinition, wasmDefinition, refWebAPI } from './API.js';

const matchGalaceanName = /@galacean\/([^\/]+)/;

export function getEngineBundle(dependence: string, platformType: PlatformType, outputDir?: string): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine, including: ${platforms}.`));

  const match = dependence.match(matchGalaceanName);
  let bundleName;
  if (match) {
    bundleName = match[1];
  }
  let entry = normalizePath(dependence);

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);

    if (platform === 'alipay') {
      continue;
    }

    const scriptsPath = path.join(rootDir, `src/platforms/${platform}/${platformType}/engine`);
    const scripts = getScriptsFromPath(scriptsPath);
    const uniqueBundleInfo: string[] = [];
    for (const script of scripts) {
      uniqueBundleInfo.push(ts.transpileModule(
        fs.readFileSync(normalizePath(path.join(scriptsPath, script)), { encoding: 'utf-8' }),
          {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS
            }
          }
        ).outputText
      );
    }

    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: {
        file: normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${platformType}/galacean-js/${bundleName}.js`)),
        format: 'cjs',
      },
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [
        resolve(),
        RebuildPlugin.getPlugins(uniqueBundleInfo),
        pluginReplaceGalaceanLogic(),
        injectWASM(wasmDefinition[platform]),
        pluginReplaceSIMDSupported(),
        pluginReplaceWebAPI(globalDefinition[platform], '.platformAdapter', ``, refWebAPI),
      ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles;
}

export function getWasmOutputs(wasm: string, platformType: PlatformType, outputDir?): string[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);

  const outputs = [];
  for (const platform of platforms) {
    outputs.push(normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${platformType}/galacean-js`)));
  }
  return outputs;
}

export function getJSWASMLoaderBundle(loader: string, platformType: PlatformType, outputDir?): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found webassembly loader, including: ${platforms}.`));

  let entry = normalizePath(loader);
  let lastIndex = loader.lastIndexOf('/');
  let bundleName = loader.substring(lastIndex == -1 ? 0 : lastIndex + 1, loader.length);

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    console.log(`Prepare webassembly bundle info for ${chalk.green(platform)}.`);

    if (platform === 'alipay') {
      continue;
    }

    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: {
        file: normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${platformType}/galacean-js/${bundleName}`)),
        format: 'cjs',
      },
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [
        resolve(),
        injectWASM(wasmDefinition[platform], [bundleName]),
        pluginReplaceWebAPI(globalDefinition[platform], '.platformAdapter', ``, refWebAPI)
      ],
    });
  }
  console.log(`Prepare webassembly bundle info complete.`);
  return bundles;
}
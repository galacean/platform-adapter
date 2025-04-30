import path from 'path';
import chalk from 'chalk';
import fs from 'fs';

import resolve from '@rollup/plugin-node-resolve';
import { BundleInfo, Platform, AppType } from './BundleInfo.js';
import { rootDir } from '../cli.js';
import { getOutputDir, getPlatformsFromPath, getScriptsFromPath, normalizePath } from '../utils/Utils.js';
import { pluginReplaceGalaceanLogic } from '../plugins/plugin-replace-engine.js';
import { pluginReplaceWebAPI } from '../plugins/plugin-replace-webapi.js';
import { pluginReplaceSIMDSupported } from '../plugins/plugin-replace-simd.js';
import ts from 'typescript';
import RebuildPlugin from '../plugins/plugin-rebuild-engine.js';
import { injectWASM } from '../plugins/plugin-inject-wasm.js';

import { globalDefinition, wasmDefinition, refWebAPI } from './API.js';

const matchGalaceanName = /@galacean\/([^\/]+)/;

function getSingleEngineBundle(bundleName: string, platform: Platform, app: AppType, entry: string, outputDir: string): BundleInfo {
  console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
  if (!fs.existsSync(entry)) {
    console.log(chalk.red(`Engine entry ${entry} not found.`));
    return null;
  }

  const scriptsPath = path.join(rootDir, `src/platforms/${platform}/${app}/engine`);
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

  return {
    bundleName,
    entry,
    output: {
      file: outputDir,
      format: 'es',
    },
    platformName: platform,
    app,
    bundleType: 'GalaceanEngine',
    rollupPlugins: [
      resolve(),
      RebuildPlugin.getPlugins(uniqueBundleInfo),
      pluginReplaceGalaceanLogic(),
      injectWASM(wasmDefinition[platform]),
      pluginReplaceSIMDSupported(),
      pluginReplaceWebAPI(globalDefinition[platform], '.platformAdapter', ``, refWebAPI),
    ],
  };
}

export function getEngineBundle(dependency: string, platform: Platform, app: AppType, projRoot?: string, outputDir?: string): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine, including: ${platforms}.`));
  if (!platforms || platforms.length === 0 || (platform !== 'all' && !platforms.includes(platform))) {
    return [];
  }

  const match = dependency.match(matchGalaceanName);
  let bundleName;
  if (match) {
    bundleName = match[1];
  }
  let entry = normalizePath(path.join(projRoot ?? '', dependency));

  let bundles: BundleInfo[] = [];
  if (platform === 'all') {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        continue;
      }
      bundles.push(getSingleEngineBundle(
        bundleName,
        platform as Platform,
        app,
        entry,
        normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${app}/${dependency}`))
      ));
    }
  } else {
    if (platform === 'alipay') {
      return bundles;
    }
    bundles.push(getSingleEngineBundle(
      bundleName,
      platform,
      app,
      entry,
      normalizePath(path.join(getOutputDir(outputDir), dependency))
    ));
  }
  console.log(chalk.green(`Prepare ${bundleName} bundle info complete.`));
  return bundles.filter(item => item != null);;
}

export function getWasmOutputs(wasm: string, platform: Platform, app: AppType, projRoot?: string, outputDir?: string): string[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  if (!platforms || platforms.length === 0 || (platform !== 'all' && !platforms.includes(platform))) {
    return [];
  }

  const outputs = [];
  if (platform === 'all') {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        continue;
      }
      outputs.push(normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${app}`)));
    }
  } else {
    if (platform === 'alipay') {
      return outputs;
    }
    outputs.push(normalizePath(path.join(getOutputDir(outputDir), `${platform}/${app}`)));
  }
  return outputs.filter(item => item != null);
}

function getSingleJSWASMLoaderBundle(bundleName: string, platform: Platform, app: AppType, entry: string, outputDir: string): BundleInfo {
  console.log(`Prepare webassembly bundle info for ${chalk.green(platform)}.`);
  if (!fs.existsSync(entry)) {
    console.log(chalk.red(`JSWASMLoader entry ${entry} not found.`));
    return null;
  }
  return {
    bundleName: bundleName,
    entry: entry,
    output: {
      file: outputDir,
      format: 'es',
    },
    platformName: platform,
    app,
    bundleType: 'GalaceanEngine',
    rollupPlugins: [
      resolve(),
      injectWASM(wasmDefinition[platform], [bundleName]),
      pluginReplaceWebAPI(globalDefinition[platform], '.platformAdapter', ``, refWebAPI)
    ],
  };
}

export function getJSWASMLoaderBundle(loader: string, platform: Platform, app: AppType, projRoot?: string, outputDir?: string): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found webassembly loader, including: ${platforms}.`));
  if (!platforms || platforms.length === 0 || (platform !== 'all' && !platforms.includes(platform))) {
    return [];
  }

  let entry = normalizePath(path.join(projRoot ?? '', loader));
  let lastIndex = loader.lastIndexOf('/');
  let bundleName = loader.substring(lastIndex == -1 ? 0 : lastIndex + 1, loader.length);

  let bundles: BundleInfo[] = [];
  if (platform === 'all') {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        continue;
      }
      bundles.push(getSingleJSWASMLoaderBundle(
        bundleName,
        platform as Platform,
        app,
        entry,
        normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${app}/${bundleName}`))
      ));
    }
  } else {
    if (platform === 'alipay') {
      return bundles;
    }
    bundles.push(getSingleJSWASMLoaderBundle(
      bundleName,
      platform,
      app,
      entry,
      normalizePath(path.join(getOutputDir(outputDir), `${bundleName}`))
    ));
  }
  console.log(chalk.green(`Prepare webassembly bundle info complete.`));
  return bundles.filter(item => item != null);
}

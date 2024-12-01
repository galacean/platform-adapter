import path from "path";
import chalk from "chalk";
import fs from 'fs';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { BundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getPlatformsFromPath, getScriptsFromPath, normalizePath } from "../utils/Utils.js";
import { pluginReplaceGalaceanLogic, pluginReplaceGalaceanImports } from '../plugins/plugin-replace-engine.js';
import { pluginReplaceWebAPI } from "../plugins/plugin-replace-webapi.js";
import { pluginReplaceSIMDSupported } from "../plugins/plugin-replace-simd.js";
import ts from 'typescript';
import RebuildPlugin from "../plugins/plugin-rebuild-engine.js";
import { injectWASM } from "../plugins/plugin-inject-wasm.js";

const Platform_GlobalVars_Map = {
  'alipay': 'global',
  'wechat': 'GameGlobal',
};

const Platform_WASM_API = {
  'wechat': 'WXWebAssembly'
}

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

export function getEngineBundle(dependencies: string, platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine, including: ${platforms}.`));

  const lastIndex = dependencies.lastIndexOf('/');
  const bundleName = dependencies.substring(lastIndex == -1 ? 0 : lastIndex + 1, dependencies.length);
  let entry;
  if (bundleName === 'engine-toolkit') {
    entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/es/index.js`));
  } else {
    entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));
  }

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);

    if (platform === 'alipay') {
      continue;
    }

    const scriptsPath = path.join(rootDir, `src/platforms/${platform}/${platformType}/engine`);
    const scripts = getScriptsFromPath(scriptsPath);
    const uniqueBundleInfo = [];
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
        file: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/galacean-js/${bundleName}.js`)),
        format: 'cjs',
      },
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [
        resolve(),
        commonjs(),
        RebuildPlugin.getPlugins(uniqueBundleInfo),
        pluginReplaceGalaceanLogic(),
        injectWASM(Platform_WASM_API[platform]),
        pluginReplaceSIMDSupported(),
        pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST),
        pluginReplaceGalaceanImports(),
      ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles;
}

export function getPhysXWASMLoaderBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found physx webassembly, including: ${platforms}.`));

  let entry = normalizePath(path.join(rootDir, `node_modules/@galacean/engine-physics-physx/libs/physx.release.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    console.log(`Prepare physx webassembly bundle info for ${chalk.green(platform)}.`);

    if (platform === 'alipay') {
      continue;
    }

    bundles.push({
      bundleName: 'physx.release',
      entry: entry,
      output: {
        file: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/galacean-js/${'physx.release'}.js`)),
        format: 'cjs',
      },
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [
        resolve(),
        injectWASM(Platform_WASM_API[platform], ['physx.release.js']),
        pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST)
      ],
    });
  }
  console.log(`Prepare physx webassembly bundle info complete.`);
  return bundles;
}

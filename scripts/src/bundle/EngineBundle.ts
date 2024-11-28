import path from "path";
import chalk from "chalk";
import fs from 'fs';

import { BundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getPlatformsFromPath, getScriptsFromPath, normalizePath } from "../utils/Utils.js";
import { pluginReplaceGalaceanLogic, pluginReplaceGalaceanImports } from '../plugins/plugin-replace-engine.js';
import { pluginReplaceWebAPI } from "../plugins/plugin-replace-webapi.js";
import { pluginReplaceSIMDSupported } from "../plugins/plugin-replace-simd.js";
import RebuildPlugin from '../plugins/plugin-rebuild-engine.js';

const Platform_GlobalVars_Map = {
  'alipay': 'global',
  'wechat': 'GameGlobal',
};

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

export function getEngineBundle(dependencie: string, platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine, including: ${platforms}.`));

  const lastIndex = dependencie.lastIndexOf('/');
  const bundleName = dependencie.substring(lastIndex == -1 ? 0 : lastIndex + 1, dependencie.length);
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

    const galaceanAdapters: string[] = [];
    const scriptsPath = path.join(rootDir, `src/platforms/${platform}/${platformType}/engine`);
    const scripts = getScriptsFromPath(scriptsPath);
    for (const script of scripts) {
      galaceanAdapters.push(fs.readFileSync(normalizePath(path.join(scriptsPath, script)), { encoding: 'utf-8' }));
    }

    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: false,
      rollupPlugins: [
        pluginReplaceGalaceanLogic(),
        pluginReplaceSIMDSupported(),
        RebuildPlugin.getPlugins(galaceanAdapters),
        pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports(),
      ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles;
}

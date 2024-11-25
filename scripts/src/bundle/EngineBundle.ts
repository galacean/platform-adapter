import path from "path";
import chalk from "chalk";

import { BundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getPlatformsFromPath, normalizePath } from "../utils/utils.js";
import { pluginReplaceGalaceanLogic, pluginReplaceGalaceanImports } from '../plugins/plugin-replace-engine.js';
import { pluginReplaceWebAPI } from "../plugins/plugin-replace-webapi.js";
import { pluginReplaceSIMDSupported } from "../plugins/plugin-replace-simd.js";

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

export function getEngineBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine, including: ${platforms}.`));

  const bundleName = 'engine';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports(), pluginReplaceSIMDSupported() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles;
}

export function getLitePhysicsBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-physics-lite';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

export function getPhysXPhysicsBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-physics-physx';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports(), pluginReplaceSIMDSupported() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

export function getPhysXPhysicsWASMBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-physics-physx';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

export function getSpineBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-spine';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

export function getShaderLabBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-shader-lab';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/module.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

export function getToolkitBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found engine adapters, including: ${platforms}.`));

  const bundleName = 'engine-toolkit';
  const entry = normalizePath(path.join(rootDir, `node_modules/@galacean/${bundleName}/dist/es/index.js`));

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform == 'alipay') {
      continue;
    }
    console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: entry,
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'GalaceanEngine',
      needUglify: true,
      rollupPlugins: [ pluginReplaceGalaceanLogic(), pluginReplaceWebAPI(Platform_GlobalVars_Map[platform], '.platformAdapter', ``, GE_REF_API_LIST), pluginReplaceGalaceanImports(), pluginReplaceSIMDSupported() ],
    });
  }
  console.log(`Prepare ${bundleName} bundle info complete.`);
  return bundles; 
}

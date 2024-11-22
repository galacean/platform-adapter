import path from "path";
import ts from '@rollup/plugin-typescript';
import chalk from "chalk";

import { BundleInfo, createBundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getPlatformsFromPath, normalizePath } from "../utils/utils.js";

export function getMinigameAdapterBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(`Found minigame adapters, including: ${chalk.green(platforms)}.`);

  const bundleName = 'polyfill';

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform === 'alipay') {
      continue;
    }
    console.log(`Prepare minigame adapter bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: normalizePath(path.join(platformsPath, `${platform}/${platformType}/polyfill/index.ts`)),
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'Adapter',
      needUglify: true,
      rollupPlugins: [ ts() ]
    });
  }
  console.log(`Prepare minigame adapter bundle info complete.`);
  return bundles;
}

export function getGalaceanAdapterBundle(platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(`Found engine adapters, including: ${chalk.green(platforms)}.`);

  const bundleName = 'galacean-adapter';

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform === 'alipay') {
      continue;
    }
    console.log(`Prepare engine adapter bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: normalizePath(path.join(platformsPath, `${platform}/${platformType}/engine/index.ts`)),
      output: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
      platformName: platform,
      platformType: platformType,
      bundleType: 'Adapter',
      needUglify: false,
      rollupPlugins: [ ts() ]
    });
  }
  console.log('Prepare engine adapter bundle info complete.');
  return bundles;
}

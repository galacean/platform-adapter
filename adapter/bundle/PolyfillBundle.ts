import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { BundleInfo, Platform, AppType } from './BundleInfo.js';
import { rootDir } from '../cli.js';
import { getOutputDir, getPlatformsFromPath, normalizePath } from '../utils/Utils.js';

function getPlatformPolyfillBundle(bundleName: string, platform: Platform, app: AppType, entry: string, outputDir: string): BundleInfo {
  console.log(`Prepare polyfill bundle info for ${chalk.green(platform)}.`);
  if (!fs.existsSync(entry)) {
    console.log(chalk.red(`Polyfill entry ${entry} not found.`));
    return null;
  }
  return {
    bundleName: bundleName,
    entry,
    output: {
      file: outputDir,
      format: 'es',
    },
    platformName: platform,
    app,
    bundleType: 'Adapter',
    rollupPlugins: [
      resolve(),
      commonjs()
    ],
  };
}

export function getPolyfillBundle(bundleName, platform: Platform, app: AppType, projRoot?: string, outputDir?: string): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found polyfill, including: ${platforms}.`));
  if (!platforms || platforms.length === 0 || (platform !== 'all' && !platforms.includes(platform))) {
    return [];
  }

  let bundles: BundleInfo[] = [];
  if (platform === 'all') {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        continue;
      }
      bundles.push(getPlatformPolyfillBundle(
        bundleName,
        platform as Platform,
        app,
        normalizePath(path.join(platformsPath, `${platform}/${app}/polyfill/index.js`)),
        normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${app}/${bundleName}.js`))
      ));
    }
  } else {
    if (platform === 'alipay') {
      return bundles;
    }
    bundles.push(getPlatformPolyfillBundle(
      bundleName,
      platform as Platform,
      app,
      normalizePath(path.join(platformsPath, `${platform}/${app}/polyfill/index.js`)),
      normalizePath(path.join(getOutputDir(outputDir), `${bundleName}.js`))
    ));
  }
  console.log(chalk.green(`Prepare polyfill bundle info complete.`));
  return bundles.filter(item => item != null);
}

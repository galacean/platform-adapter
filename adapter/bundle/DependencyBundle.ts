import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import resolve from '@rollup/plugin-node-resolve';
import { BundleInfo, Platform, AppType } from './BundleInfo.js';
import { getOutputDir, getPlatformsFromPath, normalizePath } from '../utils/Utils.js';
import { pluginReplaceWebAPI } from '../plugins/plugin-replace-webapi.js';

import { globalDefinition, refWebAPI } from './API.js';
import { rootDir } from '../cli.js';

function getSingleDependencyBundle(bundleName: string, platform: Platform, app: AppType, entry: string, outputDir: string): BundleInfo {
  console.log(`Prepare ${bundleName} bundle info for ${chalk.green(platform)}.`);
  if (!fs.existsSync(entry)) {
    console.log(chalk.red(`Dependency entry ${entry} not found.`));
    return null;
  }
  return {
    bundleName: bundleName,
    entry: entry,
    output: {
      file: outputDir,
      format: 'cjs',
    },
    platformName: platform,
    app,
    bundleType: 'Dependency',
    rollupPlugins: [
      resolve(),
      pluginReplaceWebAPI(globalDefinition[platform], '.platformAdapter', ``, refWebAPI),
    ],
  };
}

export function getDependencyBundle(dependency: string, platform: Platform, app: AppType, projRoot?: string, outputDir?: string): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(chalk.green(`Found dependencies, including: ${platforms}.`));
  if (!platforms || platforms.length === 0 || (platform !== 'all' && !platforms.includes(platform))) {
    return [];
  }

  const bundleName = path.basename(dependency);
  let entry = normalizePath(path.join(projRoot ?? '', dependency));

  let bundles: BundleInfo[] = [];
  if (platform === 'all') {
    for (const platform of platforms) {
      if (platform === 'alipay') {
        continue;
      }
      bundles.push(getSingleDependencyBundle(
        bundleName,
        platform as Platform,
        app,
        entry,
        normalizePath(path.join(getOutputDir(outputDir), `dist/${platform}/${app}/${dependency}`))
      ));
    }
  } else {
    bundles.push(getSingleDependencyBundle(
      bundleName,
      platform,
      app,
      entry,
      normalizePath(path.join(getOutputDir(outputDir), dependency))
    ));
  }
  console.log(chalk.green(`Prepare ${bundleName} bundle info complete.`));
  return bundles.filter(item => item != null);
}

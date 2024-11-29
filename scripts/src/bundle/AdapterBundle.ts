import path from "path";
import chalk from "chalk";

import { BundleInfo, PlatformType } from "./BundleInfo.js";
import { rootDir } from "../cli.js";
import { getPlatformsFromPath, normalizePath } from "../utils/Utils.js";

export function getMinigameAdapterBundle(bundleName, platformType: PlatformType): BundleInfo[] {
  const platformsPath = path.join(rootDir, `src/platforms`);
  const platforms = getPlatformsFromPath(platformsPath);
  console.log(`Found minigame adapters, including: ${chalk.green(platforms)}.`);

  let bundles: BundleInfo[] = [];
  for (const platform of platforms) {
    if (platform === 'alipay') {
      continue;
    }
    console.log(`Prepare minigame adapter bundle info for ${chalk.green(platform)}.`);
    bundles.push({
      bundleName: bundleName,
      entry: normalizePath(path.join(platformsPath, `${platform}/${platformType}/polyfill/index.ts`)),
      output: {
        file: normalizePath(path.join(rootDir, `dist/${platform}/${platformType}/${bundleName}.js`)),
        format: 'cjs',
      },
      platformName: platform,
      platformType: platformType,
      bundleType: 'Adapter',
      needUglify: true,
    });
  }
  console.log(`Prepare minigame adapter bundle info complete.`);
  return bundles;
}

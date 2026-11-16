import path from 'path';
import fs from 'fs-extra';

import Package from './Package.js';

const UMD_BUNDLE = 'dist/browser.js';

/**
 * Pick the single self-contained script that is copied into the mini-game.
 * Galacean packages that declare `umd` ship it at `dist/browser.js`; since Engine 2.0 the
 * `browser` field is gone and `main` imports sibling packages that are never copied.
 */
export function resolveDependencyScript(dependencyDir: string, packageInfo: Package): string | undefined {
  if (packageInfo.umd) {
    if (fs.pathExistsSync(path.join(dependencyDir, UMD_BUNDLE))) {
      return UMD_BUNDLE;
    }
    if (packageInfo.name.startsWith('@galacean/')) {
      throw new Error(`'${packageInfo.name}' declares umd but '${UMD_BUNDLE}' is missing; the mini-game would ship without it.`);
    }
  }
  return packageInfo.browser ?? packageInfo.main;
}

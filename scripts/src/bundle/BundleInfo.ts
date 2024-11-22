export type BundleType = 'GalaceanEngine' | 'Adapter';
export type PlatformType = 'miniprogram' | 'minigame';

export interface BundleInfo {
  bundleName: string;                        // Bundle name
  entry: string;                             // Entry file
  output: string;                            // Output file
  platformName: string;                      // Platform name
  platformType: PlatformType;                // Platform type
  bundleType?: BundleType;                   // Bundle type
  needUglify?: boolean;                      // Need uglify code
  platformGlobalVars?: string;               // Platform provides global vars
  rollupOutput?: Object | { format: 'cjs' }; // Rollup output config
  rollupPlugins?: any[];                     // Rollup plugins
}

export function createBundleInfo(): BundleInfo[] {
  return ;
}

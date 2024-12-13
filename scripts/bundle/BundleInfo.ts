import { OutputOptions } from "rollup";

export type BundleType = 'GalaceanEngine' | 'Adapter';
export type PlatformType = 'miniprogram' | 'minigame';

export interface BaseBundleInfo {
  bundleName: string;                 // Bundle name
  entry: string;                      // Entry file
  output: OutputOptions;              // Output file
  needUglify?: boolean;               // Need uglify code
  rollupPlugins?: any[];              // Rollup plugins
}
export interface BundleInfo extends BaseBundleInfo {
  platformName: string;               // Platform name
  platformType: PlatformType;         // Platform type
  bundleType?: BundleType;            // Bundle type
  platformGlobalVars?: string;        // Platform provides global vars
  uniqueBundleInfo?: string[]         // May be we need unique bundle process
}

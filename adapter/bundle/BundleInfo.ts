import { OutputOptions } from 'rollup';

export type BundleType = 'GalaceanEngine' | 'Adapter' | 'Dependency';
export type Platform = 'alipay' | 'wechat' | 'tiktok' | 'all';
export type AppType = 'miniprogram' | 'minigame' | 'all';
export const AppDefination: AppType[] = ['miniprogram', 'minigame'];

export interface BaseBundleInfo {
  bundleName: string;                 // Bundle name
  entry: string;                      // Entry file
  output: OutputOptions;              // Output file
  rollupPlugins?: any[];              // Rollup plugins
}
export interface BundleInfo extends BaseBundleInfo {
  platformName: string;               // Platform name
  app: AppType;                       // Platform app type
  bundleType?: BundleType;            // Bundle type
  platformGlobalVars?: string;        // Platform provides global vars
  uniqueBundleInfo?: string[]         // May be we need unique bundle process
}

import { Platform } from './BundleInfo';

/**
 * @brief Declares global definitions that are specific to each platform.
 */
const globalDefinition = {
  'alipay': 'globalThis',
  'tiktok': 'GameGlobal',
  'wechat': 'GameGlobal',
} as Record<Platform, string>;

/**
 * @brief Declares WebAssembly definitions specific to various platforms.
 */
const wasmDefinition = {
  'tiktok': 'TTWebAssembly',
  'wechat': 'WXWebAssembly',
} as Record<Platform, string>;

/**
 * @brief Declares the ECMAScript version that code is compiled to for each platform, by both the
 * platform adapter and the project builder.
 * - WeChat: DevTools compiles every file under 500KB to ES5 with babel 7 (preset-env), so any syntax works.
 *   The only larger file, the Engine bundle, is already ES5.
 * - TikTok (Douyin): the preview/upload compiler rejects syntax newer than ES2018 (for example optional
 *   chaining, nullish coalescing, optional catch binding, private fields, class static blocks and
 *   BigInt literals).
 */
const compileTarget = {
  'alipay': 'es2017',
  'tiktok': 'es2017',
  'wechat': 'esnext',
} as const;

/**
 * @brief Declares references to the engine's web API.
 */
const refWebAPI = [
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
  'AudioContext',

  'atob',
  'navigator',
  'performance',
  'cancelAnimationFrame',
  'requestAnimationFrame',
  '$defaultWebGLExtensions',
  'fonts',
  'URLSearchParams',

  // Mini-games do not provide these, so the platform adapter leaves them undefined. They are listed so that
  // Engine's feature checks see `undefined` in DevTools simulators as well: simulators run in a browser and
  // expose the browser's ResizeObserver, which then fails on the platform canvas (not a DOM Element).
  'ResizeObserver',
  'ResizeObserverEntry'
];

/**
 * BigInt literals (`0n`) are ES2020 syntax that swc cannot lower, so a target below ES2020 needs
 * `downlevelBigInt` after swc.
 */
function lowersBigIntLiterals(platform: string): boolean {
  return /^es(5|201\d)$/.test(compileTarget[platform] ?? '');
}

export { globalDefinition, wasmDefinition, compileTarget, lowersBigIntLiterals, refWebAPI }

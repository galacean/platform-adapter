/**
 * @brief Declares global definitions that are specific to each platform.
 */
const globalDefinition = {
  'alipay': 'globalThis',
  'tiktok': 'GameGlobal',
  'wechat': 'GameGlobal',
};

/**
 * @brief Declares WebAssembly definitions specific to various platforms.
 */
const wasmDefinition = {
  'tiktok': 'TTWebAssembly',
  'wechat': 'WXWebAssembly',
}

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
  'URLSearchParams'
];

export { globalDefinition, wasmDefinition, refWebAPI }
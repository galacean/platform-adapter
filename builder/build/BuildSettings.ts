type BuildSettings = {
  [key: string]: any,
  platform: 'alipay' | 'wechat' | 'tiktok',
  app: 'minigame' | 'miniprogram',
  project: string,
  entry: string,
  dependencies?: Array<string>,
  subpackages: Array<string>,
  assets: Array<string>,
  output?: string,
  extraWASM?: string,
  sourcemap?: boolean,
  minify?: boolean,
  wasm?: Array<{ wasmBinary: string, loader: string }>
}

export type WASMWrapper = {
  wasmBinary: string,
  loader: string
}

export default BuildSettings;

type BuildSettings = {
  [key: string]: any,
  platform: 'alipay' | 'wechat' | 'tiktok',
  app: 'minigame' | 'miniprogram',
  project?: string,
  entry?: string,
  dependencies?: Array<string>,
  subpackages?: Array<string>,
  assets?: Array<string>,
  output?: string,
  sourcemap?: boolean,
  minify?: boolean,
  wasm?: Array<{ wasmBinary: string, loader: string }>
}

export default BuildSettings;

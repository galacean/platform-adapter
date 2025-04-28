import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { BundleTaskSettings } from './bundle/BundleTask';
import { AppType, Platform } from './bundle/BundleInfo';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const rootDir = path.join(__dirname, '.');

export function parseArgs() {
  return yargs(process.argv).options({
    polyfill: {
      alias: 'p',
      type: 'boolean',
      default: false,
      describe: 'Enable build polyfills.'
    },
    engine: {
      alias: 'e',
      type: 'array',
      default: [],
      describe: 'Specify the engine modules\' path relative to root directory.'
    },
    wasm: {
      alias: 'w',
      type: 'array',
      default: [],
      describe: 'The wasm file to be upload'
    },
    jsWASMLoader: {
      alias: 'wl',
      type: 'array',
      default: [],
      describe: 'Specify the jsWASMLoader modules\' path relative to root directory.'
    },
    root: {
      alias: 'r',
      type: 'string',
      default: undefined,
      describe: 'Specify the root directory of your build. Default to current command directory.'
    },
    output: {
      alias: 'o',
      type: 'string',
      default: undefined,
      describe: 'Specify the output directory for your build. Default to current command directory.'
    },
    dependency: {
      type: 'array',
      default: [],
      describe: 'Specify the dependency entries to target for your build.'
    },
    platform: {
      type: 'string',
      default: 'all' as Platform,
      describe: 'Specify the platform. Default to all.\n微信: wechat'
    },
    app: {
      type: 'string',
      default: 'all' as AppType,
      describe: 'Specify the app type to target for your build. Default to all.\n小程序: miniprogram\n小游戏: minigame'
    },
    sourcemap: {
      type: 'boolean',
      default: false,
      describe: 'Enable source map for your build.'
    },
    minify: {
      type: 'boolean',
      default: false,
      describe: 'Enable minify for your build.'
    }
  })
  .help()
  .argv as BundleTaskSettings;
}

import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import BuildSettings from './build/BuildSettings.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const rootDir = path.join(__dirname, '..');

export function parseArgs() {
  return yargs(process.argv).options({
    project: {
      type: 'string',
      default: '',
      describe: 'Project root path. Default to the current directory.'
    },
    entry: {
      type: 'string',
      default: '',
      describe: 'Entry file path. Default to the main field in package.json.'
    },
    subpackages: {
      type: 'array',
      default: [],
      describe: 'Subpackage entries. Enable to add your own modules to the build process.'
    },
    assets: {
      type: 'array',
      default: [],
      describe: 'Assets path. Default to the public directory in your project root.'
    },
    output: {
      alias: 'o',
      type: 'string',
      default: '',
      describe: 'Output directory. Default to the name field in your package.json.'
    },
    platform: {
      alias: 'p',
      type: 'string',
      default: 'wechat',
      describe: 'Build target platform. Default to wechat.\n微信: wechat'
    },
    app: {
      type: 'string',
      default: 'minigame',
      describe: 'App type. Default to minigame.\n小程序: miniprogram\n小游戏: minigame'
    },
    sourcemap: {
      type: 'boolean',
      default: true,
      describe: 'Enable source map for your build.'
    },
    minify: {
      type: 'boolean',
      default: false,
      describe: 'Enable minify for your build.'
    },
    visualizer: {
      alias: 'v',
      type: 'boolean',
      default: false,
      describe: 'Visualize build result. You can find them under the path of $project/.trash and remove them safely.'
    }
  })
  .help()
  .argv as BuildSettings;
}

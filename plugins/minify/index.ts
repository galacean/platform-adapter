import { Plugin } from 'rollup';
import { JsMinifyOptions, minify as swcMinify } from '@swc/core';

export default function minify(options: JsMinifyOptions = {}): Plugin {
  return {
    name: 'minify',
    renderChunk: {
      order: 'post',
      handler(code) {
        return swcMinify(code, options);
      }
    }
  }
}

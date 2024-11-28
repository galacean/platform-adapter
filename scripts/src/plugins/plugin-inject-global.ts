import path from 'path';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { attachScopes, createFilter } from '@rollup/pluginutils';
import { isReference, flatten } from '../utils/PluginUtils.js';

export type Injectment =
  | string
  | {
      globalVarName: string;
      overwrite?: boolean;
      localName?: string;
      localNamePostfix?: string;
    };

export interface RollupInjectOptions {
  /**
   * All other options are treated as `string: injectment` injectrs,
   * or `string: (id) => injectment` functions.
   */
  [str: string]: Injectment | RollupInjectOptions['include'] | RollupInjectOptions['modules'] | boolean;

  /**
   * A minimatch pattern, or array of patterns, of files that should be
   * processed by this plugin (if omitted, all files are included by default)
   */
  include?: string | RegExp | ReadonlyArray<string | RegExp> | null;

  /**
   * Files that should be excluded, if `include` is otherwise too permissive.
   */
  exclude?: string | RegExp | ReadonlyArray<string | RegExp> | null;

  /**
   * You can separate values to inject from other options.
   */
  modules?: { [str: string]: Injectment };

  /**
   * 
   */
  sourceMap?: boolean;
}

const sep = path.sep;

const escape = str => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

export default function injectGlobalVars(options: RollupInjectOptions) {
  if (!options) throw new Error('Missing options');

  const filter = createFilter(options.include, options.exclude);

  let { modules } = options;

  if (!modules) {
    modules = Object.assign({}, options) as { [str: string]: Injectment };
    delete modules.include;
    delete modules.exclude;
    delete modules.sourceMap;
    delete modules.sourcemap;
  }

  const modulesMap = new Map(Object.entries(modules));

  // Fix paths on Windows
  if (sep !== '/') {
    modulesMap.forEach((mod, key) => {
      let parseMod: Injectment | string[] = mod;
      if (typeof parseMod === 'string') {
        parseMod = [parseMod] as string[];
      }
      if (Array.isArray(parseMod)) {
        parseMod = {
          globalVarName: parseMod[0],
        };
      }

      parseMod.globalVarName = parseMod.globalVarName.split(sep).join('/');
      modulesMap.set(key, parseMod);
    });
  }

  const firstpass = new RegExp(`(?:${Array.from(modulesMap.keys()).map(escape).join('|')})`, 'g');
  const sourceMap = options.sourceMap !== false;

  return {
    name: 'inject',

    transform(code, id) {
      if (!filter(id) || code.search(firstpass) === -1) return null;

      if (sep !== '/') id = id.split(sep).join('/'); // eslint-disable-line no-param-reassign

      let ast = null;
      try {
        ast = this.parse(code);
      } catch (err) {
        this.warn({
          code: 'PARSE_ERROR',
          message: `rollup-plugin-inject: failed to parse ${id}. Consider restricting the plugin to particular files via options.include`,
        });
      }
      if (!ast) return null;

      // analyse scopes
      let scope = attachScopes(ast, 'scope');
      const magicString = new MagicString(code);

      function handleReference(node, name, keypath) {
        let modCfg: string[] | Injectment = modulesMap.get(keypath);
        if (modCfg) {
          // If the value is a string, it's a global variable name.
          if (typeof modCfg === 'string') {
            modCfg = [modCfg];
          }
          // If the value is an array, wrap it in an Injectment object.
          if (Array.isArray(modCfg)) {
            modCfg = {
              globalVarName: modCfg[0],
            };
          }
          if (modCfg.overwrite && !scope.contains(name)) {
            let { globalVarName, localName, localNamePostfix = '', overwrite } = modCfg;
            if (name !== keypath || overwrite || localName) {
              magicString.overwrite(node.start, node.end, globalVarName + localName + localNamePostfix, {
                storeName: true,
              });
            }
            return true;
          }
        }
        return false;
      }

      walk(ast, {
        enter(node: any, parent) {
          if (sourceMap) {
            magicString.addSourcemapLocation(node.start);
            magicString.addSourcemapLocation(node.end);
          }

          if (node.scope) {
            scope = node.scope; // eslint-disable-line prefer-destructuring
          }

          // special case – shorthand properties. because node.key === node.value,
          // we can't differentiate once we've descended into the node
          if (node.type === 'Property' && node.shorthand) {
            const { name } = node.key;
            handleReference(node, name, name);
            this.skip();
            return;
          }

          if (isReference(node, parent)) {
            const { name, keypath } = flatten(node);
            const handled = handleReference(node, name, keypath);
            if (handled) {
              this.skip();
            }
          }
        },
        leave(node: any) {
          if (node.scope) {
            scope = scope.parent;
          }
        },
      });

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap({ hires: true }) : null,
      };
    },
  };
}

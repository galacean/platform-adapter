// @ts-nocheck

/// <reference types="node" />

/**
 * "globalThis.document.URL"
 */

import * as path from 'path';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { attachScopes, createFilter, makeLegalIdentifier } from '@rollup/pluginutils';

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
  [str: string]: Injectment | RollupInjectOptions['include'] | RollupInjectOptions['modules'];

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
}

const sep = path.sep;

const escape = str => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

const isReference = (node, parent) => {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node);
  }

  if (node.type === 'Identifier') {
    // TODO is this right?
    if (parent.type === 'MemberExpression') return parent.computed || node === parent.object;

    // disregard the `bar` in { bar: foo }
    if (parent.type === 'Property' && node !== parent.value) return false;

    // disregard the `bar` in `class Foo { bar () {...} }`
    if (parent.type === 'MethodDefinition') return false;

    // disregard the `bar` in `export { foo as bar }`
    if (parent.type === 'ExportSpecifier' && node !== parent.local) return false;

    // disregard the `bar` in `import { bar as foo }`
    if (parent.type === 'ImportSpecifier' && node === parent.imported) {
      return false;
    }

    return true;
  }

  return false;
};

const flatten = startNode => {
  const parts = [];
  let node = startNode;

  while (node.type === 'MemberExpression') {
    parts.unshift(node.property.name);
    node = node.object;
  }

  const { name } = node;
  parts.unshift(name);

  return { name, keypath: parts.join('.') };
};

export default function inject(options: RollupInjectOptions) {
  if (!options) throw new Error('Missing options');

  const filter = createFilter(options.include, options.exclude);

  let { modules } = options;

  if (!modules) {
    modules = Object.assign({}, options);
    delete modules.include;
    delete modules.exclude;
    delete modules.sourceMap;
    delete modules.sourcemap;
  }

  const modulesMap = new Map(Object.entries(modules));

  // Fix paths on Windows
  if (sep !== '/') {
    modulesMap.forEach((mod, key) => {
      if (typeof mod === 'string') mod = [mod];
      if (Array.isArray(mod)) mod = {
          globalVarName: mod[0],
        };

      mod.globalVarName = mod.globalVarName.split(sep).join('/');
      modulesMap.set(key, mod);
    });
  }

  const firstpass = new RegExp(`(?:${Array.from(modulesMap.keys()).map(escape).join('|')})`, 'g');
  const sourceMap = options.sourceMap !== false && options.sourcemap !== false;

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
        let modCfg = modulesMap.get(keypath);
        if (modCfg && modCfg.overwrite && !scope.contains(name)) {
          if (typeof modCfg === 'string') modCfg = [modCfg];
          if (Array.isArray(modCfg))
            modCfg = {
              globalVarName: modCfg[0],
            };

          let { globalVarName, localName, localNamePostfix = '', overwrite } = modCfg;

          if (name !== keypath || overwrite || localName) {
            magicString.overwrite(node.start, node.end, globalVarName + localName + localNamePostfix, {
              storeName: true,
            });
          }

          return true;
        }

        return false;
      }

      walk(ast, {
        enter(node, parent) {
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
        leave(node) {
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

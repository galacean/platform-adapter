// @ts-nocheck

/// <reference types="node" />

import inject, { RollupInjectOptions } from './plugin-inject-global.js';
import { walk } from 'estree-walker';
import { generate } from 'escodegen';
import MagicString from 'magic-string';
import { attachScopes, createFilter, makeLegalIdentifier } from '@rollup/pluginutils';
import { isReference, flatten } from '../utils/plugin-utils.js';

function replaceSIMDSupportedWX(node, code: string) {
  // 微信基础库从2.16版本开始删除了原生WebAssembly的支持, WXWebAssembly不支持部分api以及SIMD, 且不支持远程加载wasm, 必须使用local wasm
  // https://developers.weixin.qq.com/community/develop/doc/000e2c019f8a003d5dfbb54c251c00?jumpto=comment&commentid=000eac66934960576d0cb1a7256c
  if (node.type === "AssignmentExpression" &&
    node.left.type === "MemberExpression" &&
    node.left.object.type === "ThisExpression" &&
    node.left.property.name === "_simdSupported" &&
    node.right.type === "CallExpression" &&
    node.right.type === "CallExpression" &&
    (node.right.callee.object.name === "WebAssembly" || node.right.callee.object.name === "WXWebAssembly") &&
    node.right.callee.property.name === "validate") {
    // 构造新的赋值表达式节点
    const newAssignment = {
      type: "AssignmentExpression",
      operator: "=",
      left: {
        type: "MemberExpression",
        object: {
          type: "ThisExpression"
        },
        property: {
          type: "Identifier",
          name: "_simdSupported"
        }
      },
      right: {
        type: "Literal", // 使用 Literal 表示一个字面量
        value: false  // 设置字面量的值为 false
      } // 将原始调用表达式作为赋值的右侧
    }
    return code.replace(code.slice(node.start, node.end), generate(newAssignment));
  }
  return code;
}

export function replaceGalaceanLogic() {
  return {
    name: 'replaceGalaceanLogic',
    transform(code: string, id: string) {
      if (id.indexOf('@galacean') > -1) {
        code = code.replace(
          `gl[_glKey] = extensionVal;`,
          `try { gl[_glKey] = extensionVal; } catch (e) { console.error(e); }`,
        );
        code = code.replace(
          `this._requireResult = {};`,
          `this._requireResult = Object.assign({}, $defaultWebGLExtensions)`,
        );

        const ast = this.parse(code);
        walk(ast, {
          enter(node) {
            code = replaceSIMDSupportedWX(node, code);
          }
        });

        code = code.replace(/WebAssembly/g, `WXWebAssembly`);
      }
      return { code, map: null };
    }
  };
}

export function replaceAPICaller(entry: string, injectName: string, injectNamePostfix: string, apiList: string[]) {
  return inject(
    {
      modules: apiList.reduce((acc, curr) => {
        const injectSetting = {
          globalVarName: entry,
          localName: injectName,
          localNamePostfix: injectNamePostfix.concat(`.${curr}`),
          overwrite: true,
        };

        acc[curr] = injectSetting;
        acc[`self.${curr}`] = injectSetting;

        return acc;
      }, {}),
    }
  );
}

export function injectGalaceanImports(options={sourceMap: false, sourcemap:false}) {
  return {
    name: 'injectGalaceanImports',
    transform(code: string,id: string) {
      if (id.indexOf('@galacean') > -1) {
        const regex = /import\s*{\s*[^}]*\s*}\s*from\s*(['"])(@galacean\/engine)\1;/g;
        const matches = code.match(regex);
        if (matches) {
          const match = matches[0];
          const imports = match.match(/(?<=^import\s*\{)[^}]+(?=\})/)?.[0].split(',').map((item: string) => item.trim());
          code = code.replace(match, `const galacean = require('./engine.js');`);

          const modulesCfg = imports.reduce((acc, curr) => {
            // Some modules may used aliases, such as import { WebGLEngine as t } from '@galacean/engine';
            let parsedImports = curr.split(/\s*as\s*/);
            let importName = curr, aliasImportName = curr;
            if (parsedImports.length === 2) {
                importName = parsedImports[0];
                aliasImportName = parsedImports[1];
            }
            acc[aliasImportName] = {
                refName: 'galacean',
                localNamePostfix: `.${importName}`,
                overwrite: true,
            };
            return acc;
          }, {});
          const modulesMap = new Map(Object.entries(modulesCfg));

          const firstpass = new RegExp(`(?:${imports.join('|')})`, 'g');
          const sourceMap = options.sourceMap !== false && options.sourcemap !== false;

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
    
          let scope = attachScopes(ast, 'scope');
          const magicString = new MagicString(code);

          function handleReference(node, name, keypath) {
            let modCfg = modulesMap.get(keypath);
            if (modCfg && modCfg.overwrite && !scope.contains(name)) {
              let { refName, localNamePostfix = '', overwrite } = modCfg;

              if (name !== keypath || overwrite) {
                magicString.overwrite(node.start, node.end, refName + localNamePostfix, {
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
        }
      }
    }
  };
};

// @ts-nocheck

import { BaseNode } from 'estree';
import { walk } from 'estree-walker';
import { generate } from 'escodegen';

export function pluginReplaceSIMDSupported() {
  return {
    name: 'replaceSIMDSupported',
    transform(code: string, id: string) {
      if (id.indexOf('@galacean') > -1) {
        const ast = this.parse(code);
        walk(ast, {
          enter(node: Node) {
            // 微信基础库从2.16版本开始删除了原生WebAssembly的支持, WXWebAssembly不支持部分api以及SIMD, 且不支持远程加载wasm, 必须使用local wasm
            // https://developers.weixin.qq.com/community/develop/doc/000e2c019f8a003d5dfbb54c251c00?jumpto=comment&commentid=000eac66934960576d0cb1a7256c
            // TODO: 微信8.05支持了 SIMD
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
              code.replace(code.slice(node.start, node.end), generate(newAssignment));
            }
          }
        });
      }
      return { code, map: null };
    }
  }
}

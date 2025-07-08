import { Node } from 'estree';
import { walk } from 'estree-walker';
import { ASTNode, ASTNodeWrapper, ASTType, ClassParser, getASTParser } from '../utils/AST/index.js';
import { getNodeName } from 'adapter/utils/PluginUtils.js';
import MagicString from 'magic-string';
import { generate } from 'escodegen';
import { Plugin } from 'rollup';

function parseEngineAdapterNode(ast: Node): ASTNodeWrapper {
  let parsed = undefined;
  walk(ast, {
    enter(node) {
      if (node.type === 'Program' && node.body && node.body.length > 0) {
        // Assume that node.body contains only one element.
        let astNode = getASTParser(node.body[0])?.parse();
        if (astNode) {
          parsed = astNode;
          this.skip();
        }
      }
    }
  });
  return parsed;
}

export default class RebuildPlugin {
  static getPlugins(sourcecode: string | string[]): Plugin[] {
    if (!sourcecode) {
      return undefined;
    }
    return [
      {
        name: 'inject-galacean-adapter-code',
        transform(code: string, id: string) {
          if (id.indexOf('@galacean') == -1) {
            return;
          }
          if (typeof sourcecode === 'string') {
            sourcecode = [sourcecode];
          }

          const galaceanAdapterMap: Record<string, ASTNodeWrapper> = {};
          sourcecode.forEach(sc => {
            const astNodeWrapper = parseEngineAdapterNode(this.parse(sc));
            if (astNodeWrapper) {
              for (const wrapper in astNodeWrapper) {
                const node = astNodeWrapper[wrapper];
                galaceanAdapterMap[node.node.name] = astNodeWrapper;
              }
            }
          });

          let magicString = new MagicString(code);
          function rebuildCode(node: Node): boolean {
            if (node) {
              let galaceanAdapterNode: ASTNode = undefined;
              const nodeName = getNodeName(node)
              if (galaceanAdapterMap[nodeName]) {
                galaceanAdapterNode = galaceanAdapterMap[nodeName][node.type]
              }
              if (!galaceanAdapterNode) {
                return false;
              }
              const { astType, node: adapterNode, members: adapterMembers } = galaceanAdapterNode.node;
              switch (astType) {
                case ASTType.Class:
                  const originCodeParser = getASTParser(node);
                  if (!originCodeParser) {
                    return false;
                  }
                  const originASTNodeWrapper = originCodeParser.parse();
                  if (originCodeParser.type === ASTType.Class) {
                    const originMembers = originASTNodeWrapper[node.type].node.members;
                    for (const memberName in adapterMembers) {
                      const adapterMember = adapterMembers[memberName];
                      const originMember = originMembers[memberName]
                      // Jump over properties in the class. Because it's not necessary to rebuild them.
                      // todo: Need implement a way to append extra code in the class.
                      if (adapterMember.type === 'Identifier' || !originMember) {
                        continue;
                      }
                      // @ts-ignore
                      magicString = magicString.overwrite(originMember.start, originMember.end, generate(adapterMember), { storeName: true });
                    }
                    return true;
                  }
                  return false;
                case ASTType.Function:
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, generate(adapterNode), { storeName: true });
                  return true;;
                default:
                  return false;
              }
            }
          }

          const ast = this.parse(code);
          walk(ast, {
            enter(node: any) {
              rebuildCode(node);
            },
          });
          return {
            code: magicString.toString(),
            map: null
          }
        }
      }
    ];
  }
}

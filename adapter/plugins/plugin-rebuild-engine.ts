import { Node } from 'estree';
import { walk } from 'estree-walker';
import { ASTNode, ASTNodeWrapper, ASTType, ClassParser, getASTParser } from '../utils/AST/index.js';
import { getNodeName } from '../utils/PluginUtils.js';
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

/** Whether an accessor descriptor (`{ key, get, set }`) declares `name`. False for any other member. */
function hasProperty(member: any, name: string): boolean {
  return member?.type === 'ObjectExpression' &&
    member.properties.some((p: any) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === name);
}

export default class RebuildPlugin {
  static getPlugins(sourcecode: string | string[], packageName = 'Engine'): Plugin[] {
    if (!sourcecode) {
      return undefined;
    }
    // Overrides given to this bundle, and the ones found in its code.
    const expected = new Set<string>();
    const matched = new Set<string>();
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
                expected.add(node.node.name);
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
                      if (adapterMember.type === 'Identifier') {
                        continue;
                      }
                      // An override whose target is gone or whose signature changed silently ships stale
                      // behaviour, so stop the build and let the override be updated for this Engine.
                      if (!originMember) {
                        throw new Error(`Adapter override '${nodeName}.${memberName}' no longer exists in '${id}'.`);
                      }
                      // An accessor is replaced whole: one that leaves out Engine's getter or setter would drop it.
                      for (const kind of ['get', 'set']) {
                        if (hasProperty(originMember, kind) && !hasProperty(adapterMember, kind)) {
                          throw new Error(
                            `Adapter override '${nodeName}.${memberName}' has no '${kind}' but Engine's accessor has one in '${id}': write both, or Engine's '${kind}' is lost.`
                          );
                        }
                      }
                      const adapterParams = (adapterMember as any).params?.length;
                      const originParams = (originMember as any).params?.length;
                      if (adapterParams !== originParams) {
                        throw new Error(
                          `Adapter override '${nodeName}.${memberName}' takes ${adapterParams} parameters but Engine's takes ${originParams} in '${id}'.`
                        );
                      }
                      // @ts-ignore
                      magicString = magicString.overwrite(originMember.start, originMember.end, generate(adapterMember), { storeName: true });
                    }
                    matched.add(nodeName);
                    return true;
                  }
                  return false;
                case ASTType.Function:
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, generate(adapterNode), { storeName: true });
                  matched.add(nodeName);
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
        },
        buildEnd(error?: Error) {
          if (error) {
            return;
          }
          // An override that matches nothing (for example after Engine changes how a class is
          // declared) would silently ship Engine's own code, so stop the build instead.
          const missing = [...expected].filter(name => !matched.has(name));
          if (missing.length > 0) {
            this.error(`Adapter overrides not found in '${packageName}': ${missing.join(', ')}.`);
          }
        }
      }
    ];
  }
}

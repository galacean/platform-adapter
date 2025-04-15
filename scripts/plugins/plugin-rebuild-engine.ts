import { Node } from 'estree';
import { walk } from 'estree-walker';
import { ASTNode, ASTNodeWrapper, ASTType, ClassParser, FunctionParser } from '../utils/ASTParser.js';
import MagicString from 'magic-string';
import { generate } from 'escodegen';
import { Plugin } from 'rollup';

/**
 * A parser for galacean adapter code
 */
class GalaceanAdapterParser {
  constructor(protected ast: Node) { }

  parseNode(node: Node): ASTNodeWrapper {
    if (node.type === 'Program' && node.body) {
      let parsed = undefined;
      // Assume that node.body contains only one element.
      for (const subNode of node.body) {
        switch (subNode.type) {
          case 'ClassDeclaration':
          case 'VariableDeclaration':
          case 'ExpressionStatement':
            parsed = new ClassParser(subNode).parse();
            break;
          case 'FunctionDeclaration':
            parsed = new FunctionParser(subNode).parse();
            break;
          default:
            break;
        }
      }
      return parsed;
    }
    return undefined;
  }

  parse(): ASTNodeWrapper {
    const parseNode = this.parseNode;
    let parsed;
    walk(this.ast, {
      enter(node) {
        const astNode = parseNode(node);
        if (astNode) {
          parsed = astNode;
          this.skip();
        }
      }
    });
    return parsed;
  }
}

function getNodeName(node: Node) {
  let name = '';
  if (node.type === 'ExpressionStatement') {
    if (node.expression.type === 'AssignmentExpression') {
      const left = node.expression.left;
      if (left.type === 'MemberExpression') {
        if (left.object.type === 'Identifier' && left.property.type === 'Identifier') {
          name = left.property.name
        }
      }
    }
  } else {
    // @ts-ignore
    name = node.id ? node.id.name : node.name;
  }
  return name ?? '';
}

export default class RebuildPlugin {
  static getPlugins(sourcecode: string | string[]): Plugin[] {
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
            const parser = new GalaceanAdapterParser(this.parse(sc));
            const astNodeWrapper = parser.parse();
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
              let nodeName = getNodeName(node)
              if (galaceanAdapterMap[nodeName]) {
                galaceanAdapterNode = galaceanAdapterMap[nodeName][node.type]
              }
              if (!galaceanAdapterNode) {
                return false;
              }
              const { astType, node: adapterNode, members: adapterMembers } = galaceanAdapterNode.node;
              switch (astType) {
                case ASTType.Class:
                  let classParser = new ClassParser(node);
                  const originASTNodeWrapper = classParser.parse();
                  if (classParser.isClass) {
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

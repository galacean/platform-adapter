import { Node } from 'estree';
import { walk } from 'estree-walker';
import { ASTNode, ASTType, ClassParser, FunctionParser } from '../utils/ASTParser.js';
import MagicString from 'magic-string';
import { generate } from 'escodegen';

/**
 * A parser for galacean adapter code
 */
class GalaceanAdapterParser {
  constructor(protected ast: Node) { }

  parseNode(node: Node): ASTNode[] {
    if (node.type === 'Program' && node.body) {
      let parsed = [];
      for (const subNode of node.body) {
        switch (subNode.type) {
          case 'ClassDeclaration':
          case 'VariableDeclaration':
            parsed.push(new ClassParser(subNode).parse());
            break;
          case 'FunctionDeclaration':
            parsed.push(new FunctionParser(subNode).parse());
            break;
          default:
            break;
        }
      }
      return parsed.length > 0 ? parsed.flat() : undefined;
    }
    return undefined;
  }

  parse(): ASTNode[] {
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

export default class RebuildPlugin {
  static getPlugins(sourcecode: string | string[]) {
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

          const galaceanAdapters: ASTNode[] = [];
          sourcecode.forEach(sc => {
            const parser = new GalaceanAdapterParser(this.parse(sc));
            const result = parser.parse();
            if (result) {
              galaceanAdapters.push(...result);
            }
          });
          const gaMap = galaceanAdapters.reduce((acc, cur) => {
            !acc[cur.name] && (acc[cur.name] = {});
            acc[cur.name][cur.type] = cur;
            return acc;
          }, {} as Record<string, Record<string, ASTNode>>);

          const magicString = new MagicString(code);
          function rebuildCode(node: Node): boolean {
            if (node) {
              let gaWrapper;
              let ga: ASTNode;
              let adapterNode;
              // @ts-ignore
              let nodeName = node.id ? node.id.name : node.name;
              gaWrapper = gaMap[nodeName];
              gaWrapper && (ga = gaWrapper[node.type]);
              if (!ga) {
                return false;
              }
              switch (ga.astType) {
                case ASTType.Class:
                  let classParser = new ClassParser(node);
                  classParser.parse();
                  if (classParser.isClass) {
                      adapterNode = ga.node;
                      // @ts-ignore
                      magicString.overwrite(node.start, node.end, generate(adapterNode), {
                        storeName: true
                      });
                      return true;
                  }
                  return false;
                case ASTType.Function:
                  adapterNode = ga.node;
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, generate(adapterNode), {
                    storeName: true
                  });
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

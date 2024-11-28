import { Node } from 'estree';
import { walk } from 'estree-walker';
import { generateCode } from '../utils/PluginUtils.js';
import { ASTNode, ASTType, ClassParser, FunctionParser } from '../utils/ASTParser.js';
import ts from '@rollup/plugin-typescript'

/**
 * A parser for galacean adapter code
 */
class GalaceanAdapterParser {
  constructor(protected ast: Node) { }

  parseNode(node: Node): ASTNode[] {
    switch (node.type) {
      case 'ClassDeclaration':
        return new ClassParser(node).parse();
      case 'FunctionDeclaration':
        return new FunctionParser(node).parse();
      default:
        return undefined;
    }
  }

  parse(): ASTNode[] {
    const parseNode = this.parseNode;
    let parsed = [];
    walk(this.ast, {
      enter(node) {
        const astNode = parseNode(node);
        if (astNode) {
          parsed.push(astNode);
        }
      }
    });
    return parsed.flat();
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
            galaceanAdapters.push(...parser.parse());
          });
          const gaMap = galaceanAdapters.reduce((acc, cur) => {
            !acc[cur.name] && (acc[cur.name] = {});
            acc[cur.name][cur.type] = cur;
            return acc;
          }, {} as Record<string, Record<string, ASTNode>>);

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
                  let parsed = classParser.parse();
                  if (classParser.isClass) {
                    for (const k in ga.nodes) {
                      const p = parsed[0].nodes[k];
                      adapterNode = ga.nodes[k];
                      // @ts-ignore
                      code = code.replace(code.slice(p.start, p.end), generateCode(adapterNode));
                    }
                    return true;
                  }
                  return false;
                case ASTType.Function:
                  adapterNode = ga.nodes;
                  // @ts-ignore
                  code = code.replace(code.slice(node.start, node.end), generateCode(adapterNode));
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
            code,
            map: null
          }
        }
      }
    ];
  }
}

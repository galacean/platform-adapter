import MagicString from 'magic-string';
import type { Plugin, ProgramNode } from 'rollup';
import { walk } from 'estree-walker';

export default function rebuildDependency(entries: { 
  find: string, 
  replacement: string 
}[]): Plugin {
  const replacementMap = new Map(entries.map(e => [e.find, e.replacement]));
  console.log('remapping dependencies =>', replacementMap);
  return {
    name: 'rebuild-dependency',
    transform(code) {
      let ast: ProgramNode;
      try {
        ast = this.parse(code);
      } catch {
        return null;
      }
      const magic = new MagicString(code);
      let hasReplaced = false;
      const handlers = {
        ImportDeclaration(node) {
          const source = node.source;
          if (!source?.value) return;
          const newPath = replacementMap.get(source.value);
          if (!newPath) return;
          const quote = source.raw[0];
          magic.overwrite(
            source.start,
            source.end,
            `${quote}${newPath}${quote}`
          );
          hasReplaced = true;
        },
        CallExpression(node) {
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'require' &&
            node.arguments[0]?.type === 'Literal'
          ) {
            const arg = node.arguments[0];
            const newPath = replacementMap.get(arg.value);
            if (!newPath) return;
            const quote = arg.raw[0];
            magic.overwrite(
              arg.start,
              arg.end,
              `${quote}${newPath}${quote}`
            );
            hasReplaced = true;
          }
        },
        ImportExpression(node) {
          if (node.source?.type !== 'Literal') return;
          const newPath = replacementMap.get(node.source.value);
          if (!newPath) return;
          const quote = node.source.raw[0];
          magic.overwrite(
            node.source.start,
            node.source.end,
            `${quote}${newPath}${quote}`
          );
          hasReplaced = true;
        }
      };
      walk(ast, {
        enter: (node) => {
          const handler = handlers[node.type];
          if (handler) {
            handler(node);
          }
        }
      });
      if (!hasReplaced) return null;
      return {
        code: magic.toString(),
        map: magic.generateMap({ hires: true })
      };
    }
  };
}
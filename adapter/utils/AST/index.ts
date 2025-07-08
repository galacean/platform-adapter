import { Node } from 'estree';
import ASTParser, { ASTType } from './ASTParser.js';
import ClassParser from './ClassParser.js';
import FunctionParser from './FunctionParser.js';
import { isAnonymousFunction, isFunction } from '../PluginUtils.js';

export type { ASTNode, ASTNodeWrapper } from './ASTParser.js';
export { ASTType, ASTParser, ClassParser };

export function getASTParser(node: Node): ASTParser {
  switch (node.type) {
    case 'ClassDeclaration':
      return new ClassParser(node);
    case 'ExpressionStatement':
      if (node.expression.type === 'AssignmentExpression' && isAnonymousFunction(node.expression.right)) {
        return new ClassParser(node);
      }
      break;
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      return new FunctionParser(node);
    case 'VariableDeclaration':
      node = node.declarations[0];
    case 'VariableDeclarator':
      if (isAnonymousFunction(node)) {
        return new ClassParser(node);
      } else if (isFunction(node)) {
        return new FunctionParser(node);
      }
    default:
      break;
  }
  return undefined;
}

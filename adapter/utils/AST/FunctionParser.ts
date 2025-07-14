import {
  Identifier,
} from 'estree';
import ASTParser, { ASTNode, ASTNodeWrapper, ASTType } from './ASTParser.js';
import { getNodeName } from '../PluginUtils.js';

export default class FunctionParser extends ASTParser {
  parse(): ASTNodeWrapper {
    const node = this.astNode;
    let functionName;
    if (node.type !== 'FunctionDeclaration' &&
        node.type !== 'FunctionExpression' &&
        node.type !== 'VariableDeclarator') {
        this.astType = ASTType.Other;
        return undefined;
    }

    functionName = getNodeName(node);
    this.astType = ASTType.Function;

    const parsedNode = {
      name: functionName,
      node: node,
      astType: this.astType
    };
    const result = { [node.type]: { type: node.type, node: parsedNode } as ASTNode }
    return result;
  }
}

import {
  Node,
  FunctionExpression,
} from 'estree';
import { isCJSPrototype, renameFunctionNode, getNodeName } from '../PluginUtils.js';
import ASTParser, { NodeWrapper, ASTNode, ASTNodeWrapper, ASTType } from './ASTParser.js';

export default class ClassParser extends ASTParser {
  static parseClassAsCJS(node: Node, className = ''): NodeWrapper {
    // This may be a class declaration
    const members: NodeWrapper = {};
    let parsed;
    switch (node.type) {
      case 'VariableDeclarator':
        if (node.init && node.init.type === 'CallExpression') {
          if (node.init.callee.type === 'FunctionExpression') {
            const statements = node.init.callee.body.body;
            for (const statement of statements) {
              parsed = this.parseClassAsCJS(statement, className);
              parsed && (Object.assign(members, parsed));
            }
          }
        }
        break;
      case 'VariableDeclaration':
        const declarations = node.declarations;
        for (const declaration of declarations) {
          parsed = this.parseClassAsCJS(declaration, className);
          parsed && (Object.assign(members, parsed));
        }
        break;
      case 'FunctionDeclaration':
        const statements = node.body.body;
        for (const statement of statements) {
          parsed = this.parseClassAsCJS(statement, className);
          parsed && (Object.assign(members, parsed));
        }
        break;
      case 'ExpressionStatement':
        if (node.expression.type === 'AssignmentExpression') {
          const left = node.expression.left;
          const right = node.expression.right;
          if (left.type === 'MemberExpression') {
            if (left.object.type === 'ThisExpression' &&
                left.property.type === 'Identifier') {
              // Return class property.
              Object.assign(members, { [left.property.name]: left.property });
            } else if (left.object.type === 'MemberExpression') {
              let curLeft = left.object;
              while (curLeft.object.type === 'MemberExpression') {
                curLeft = curLeft.object;
              }
              if (curLeft.property.type === 'Identifier' &&
                  isCJSPrototype(curLeft.property.name) &&
                  left.property.type === 'Identifier') {
                // Return class method.
                const _name = left.property.name;
                const _node = node.expression.right;
                if (!(node.expression.right as FunctionExpression).id) {
                  renameFunctionNode(_node as FunctionExpression, _name);
                }
                Object.assign(members, { [_name]: _node });
              }
            } else if (
              left.object.type === 'Identifier' &&
              // If name equals protoType or equals className, it may be a normal method or a static method in class.
              (isCJSPrototype(left.object.name) || left.object.name === className) &&
              left.property.type === 'Identifier'
            ) {
              // Return class method.
              const _name = left.property.name;
              const _node = node.expression.right;
              if (!(_node as FunctionExpression).id) {
                if (_node.type === 'CallExpression' && _node.callee.type === 'FunctionExpression' && _node.callee.body.body.length > 0) {
                  for (const statement of _node.callee.body.body) {
                    parsed = this.parseClassAsCJS(statement, className);
                    parsed && (Object.assign(members, parsed));
                  }
                  return members;
                } else {
                  renameFunctionNode(_node as FunctionExpression, _name);
                }
              }
              Object.assign(members, { [_name]: _node });
            }
          }
          if (right.type === 'FunctionExpression') {
            for (const statement of right.body.body) {
              parsed = this.parseClassAsCJS(statement, className);
              parsed && (Object.assign(members, parsed));
            }
          }
        } else if (node.expression.type === 'CallExpression') {
          // Record the callee function name.
          const callee = node.expression.callee;
          if (callee.type === 'Identifier') {
            const _name = callee.name;
            Object.assign(members, { [_name]: node });
          }
        }
        break;
      default:
        break;
    }
    return members;
  }

  parse(): ASTNodeWrapper {
    const node = this.astNode;

    if (node.type !== 'ExpressionStatement' &&
        node.type !== 'VariableDeclarator') {
      this.astType = ASTType.Other;
      return undefined;
    }

    let className = getNodeName(node);
    if (!className) {
      return undefined;
    }

    let members = ClassParser.parseClassAsCJS(node, className);
    let parsed = node;

    this.astType = ASTType.Class;
    const parsedNode = {
      name: className,
      node: parsed,
      astType: this.astType,
      members: members
    };
    const result = { [node.type]: { type: node.type, node: parsedNode } as ASTNode }
    return result;
  }
}

import {
  Node,
  Identifier,
  AssignmentExpression,
  ClassDeclaration,
  MemberExpression,
  VariableDeclarator,
  FunctionExpression,
  ExpressionStatement
} from 'estree';
import { isCJSPrototype, renameFunctionNode, isAnonymousFunction } from './PluginUtils.js';

enum ASTType {
  Other = 0,
  Class = 1,
  Function = 2,
}
type NodeWrapper = Record<string, Node>
type ASTNode = {
  type: string,
  node: {
    name: string,
    node: Node,
    astType: ASTType,
    members?: NodeWrapper
  }
}
type ASTNodeWrapper = Record<string, ASTNode>

abstract class ASTParser {
  protected astNode: Node;

  constructor(node: Node) {
    this.astNode = node;
  }

  parse(): ASTNodeWrapper {
    return undefined;
  }
}

class ClassParser extends ASTParser {
  protected _isClass: boolean = false;

  public get isClass() {
    return this._isClass;
  }

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
              if (!(node.expression.right as FunctionExpression).id) {
                renameFunctionNode(_node as FunctionExpression, _name);
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

  parseNode(node: ClassDeclaration | VariableDeclarator | ExpressionStatement, className = ''): NodeWrapper {
    return ClassParser.parseClassAsCJS(node, className);
  }

  parse(): ASTNodeWrapper {
    const node = this.astNode;

    let parsed;
    let className;
    let members;
    switch(node.type) {
      case 'VariableDeclaration':
        const declarator = node.declarations[0];
        className = (declarator.id as Identifier).name;
        members = this.parseNode(declarator, className);
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          this._isClass = isAnonymousFunction(declarator);
          if (!this._isClass) {
            return undefined;
          }
          parsed = declarator;
        }
        break;
      case 'VariableDeclarator':
        className = (node.id as Identifier).name;
        members = this.parseNode(node, className);
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          this._isClass = isAnonymousFunction(node);
          if (!this._isClass) {
            return undefined;
          }
          parsed = node;
        }
        break;
      case 'ExpressionStatement':
        const assignmentNode = node.expression as AssignmentExpression;
        className = ((assignmentNode.left as MemberExpression).property as Identifier).name;
        members = this.parseNode(node, className);
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          this._isClass = node.expression.type === 'AssignmentExpression' && isAnonymousFunction(assignmentNode.right);
          if (!this._isClass) {
            return undefined;
          }
          parsed = node;
        }
        break;
      default:
        this._isClass = false;
        return undefined;
    }

    if (!className) {
      return undefined;
    }

    const astType = this.isClass ? ASTType.Class : ASTType.Other;
    const parsedNode = {
      name: className,
      node: parsed,
      astType: astType,
      members: members
    };
    const result = ([
      {
        type: 'VariableDeclarator',
      },
      {
        type: 'ExpressionStatement',
      }
    ] as ASTNode[]).reduce((acc, cur) => {
      cur.node = parsedNode;
      acc[cur.type] = cur;
      return acc;
    }, {} as ASTNodeWrapper);
    return result;
  }
}

class FunctionParser extends ASTParser {
  protected _isFunction: boolean = false;

  public get isFunction() {
    return this._isFunction;
  }

  parse(): ASTNodeWrapper {
    const node = this.astNode;
    let functionName;
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        this._isFunction = true;
        functionName = node.id?.name;
        break;
      default:
        this._isFunction = false;
        return undefined;
    }

    const astType = this.isFunction ? ASTType.Function : ASTType.Other;
    const parsedNode = {
      name: functionName,
      node: node,
      astType: astType
    };
    const result = ([
      {
        type: 'FunctionDeclaration',
      },
      {
        type: 'FunctionExpression',
      }
    ] as ASTNode[]).reduce((acc, cur) => {
      cur.node = parsedNode;
      acc[cur.type] = cur;
      return acc;
    }, {} as ASTNodeWrapper);
    return result;
  }
}

export { ASTParser, ASTType, ClassParser, FunctionParser };
export type { ASTNode, ASTNodeWrapper };

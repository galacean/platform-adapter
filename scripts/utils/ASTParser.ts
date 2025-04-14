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

type MoudleType = 'ECMA' | 'CJS';

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

  static parseClassAsESNext(node: Node): NodeWrapper {
    switch (node.type) {
      case 'PropertyDefinition':
      case 'MethodDefinition':
        return { [(node.key as Identifier).name]: node } as NodeWrapper;
      case 'ClassDeclaration':
        return this.parseClassAsESNext(node.body)
      case 'ClassBody':
        const bodies = node.body;
        const members: NodeWrapper = {};
        for (let i = 0, len = bodies.length; i < len; ++i) {
          Object.assign(members, this.parseClassAsESNext(bodies[i]));
        }
        return members;
      default:
        return undefined;
    }
  }

  static parseClassAsCJS(node: Node): NodeWrapper {
    // This may be a class declaration
    const members: NodeWrapper = {};
    let parsed;
    switch (node.type) {
      case 'VariableDeclarator':
        if (node.init && node.init.type === 'CallExpression') {
          if (node.init.callee.type === 'FunctionExpression') {
            const statements = node.init.callee.body.body;
            for (const statement of statements) {
              parsed = this.parseClassAsCJS(statement);
              parsed && (Object.assign(members, parsed));
            }
          }
        }
        break;
      case 'VariableDeclaration':
        const declarations = node.declarations;
        for (const declaration of declarations) {
          parsed = this.parseClassAsCJS(declaration);
          parsed && (Object.assign(members, parsed));
        }
        break;
      case 'FunctionDeclaration':
        const statements = node.body.body;
        for (const statement of statements) {
          parsed = this.parseClassAsCJS(statement);
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
              isCJSPrototype(left.object.name) &&
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
              parsed = this.parseClassAsCJS(statement);
              parsed && (Object.assign(members, parsed));
            }
          }
        }
        break;
      default:
        break;
    }
    return members;
  }

  parseNode(node: ClassDeclaration | VariableDeclarator | ExpressionStatement, type: MoudleType = 'ECMA'): NodeWrapper {
    switch (type) {
      case 'CJS':
        return ClassParser.parseClassAsCJS(node);
      case 'ECMA':
        return ClassParser.parseClassAsESNext(node);
      default:
        return undefined;
    }
  }

  parse(): ASTNodeWrapper {
    const node = this.astNode;

    let parsed;
    let className;
    let members;
    switch(node.type) {
      case 'ClassDeclaration':
        this._isClass = true;
        className = node.id.name;
        members = this.parseNode(node);
        members && (parsed = node);
        break;
      case 'VariableDeclaration':
        const declarator = node.declarations[0];
        members = this.parseNode(declarator, 'CJS');
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          this._isClass = isAnonymousFunction(declarator);
          if (!this._isClass) {
            return undefined;
          }
          className = (declarator.id as Identifier).name;
          parsed = declarator;
        }
        break;
      case 'VariableDeclarator':
        members = this.parseNode(node, 'CJS');
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          this._isClass = isAnonymousFunction(node);
          if (!this._isClass) {
            return undefined;
          }
          className = (node.id as Identifier).name;
          parsed = node;
        }
        break;
      case 'ExpressionStatement':
        members = this.parseNode(node, 'CJS');
        if (members) {
          // If the assignment expression is anonymous function, the block will be parsed as a class.
          const assignmentNode = node.expression as AssignmentExpression;
          this._isClass = node.expression.type === 'AssignmentExpression' && isAnonymousFunction(assignmentNode.right);
          if (!this._isClass) {
            return undefined;
          }
          className = ((assignmentNode.left as MemberExpression).property as Identifier).name;
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
        type: 'ClassDeclaration',
      },
      {
        type: 'ClassExpression',
      },
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

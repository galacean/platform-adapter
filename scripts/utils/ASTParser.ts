import { Node, Identifier, VariableDeclarator, FunctionExpression, ExpressionStatement } from 'estree';
import { isCJSPrototype, renameFunctionNode, isAnonymousFunction } from './PluginUtils.js';

interface NodeWrapper {
  name: string,
  node: Node
}
enum ASTType {
  Other = 0,
  Class = 1,
  Function = 2,
}
type ASTNode = {
  name: string,
  type: string,
  node: Node,
  astType: ASTType,
}

class ASTParser {
  protected astNode: Node;

  constructor(node: Node) {
    this.astNode = node;
  }

  parse(): ASTNode[] {
    return undefined;
  }
}

class ClassParser extends ASTParser {
  protected _isClass: boolean = false;

  public get isClass() {
    return this._isClass;
  }

  static parsePropertyAndMethodAsESNext(node: Node): NodeWrapper | NodeWrapper[] {
    switch (node.type) {
      case 'PropertyDefinition':
      case 'MethodDefinition':
        return { name: (node.key as Identifier).name, node: node } as NodeWrapper;
      case 'ClassDeclaration':
        return this.parsePropertyAndMethodAsESNext(node.body)
      case 'ClassBody':
        const bodies = node.body;
        const members = [];
        for (let i = 0, len = bodies.length; i < len; ++i) {
          members.push(this.parsePropertyAndMethodAsESNext(bodies[i]));
        }
        return members;
      default:
        return undefined;
    }
  }

  static parsePropertyAndMethodAsCommonJS(node: Node): NodeWrapper | NodeWrapper[] {
    // This may be a class declaration
    const members = [];
    let parsed;
    switch (node.type) {
      case 'VariableDeclarator':
        if (node.init && node.init.type === 'CallExpression') {
          if (node.init.callee.type === 'FunctionExpression') {
            const statements = node.init.callee.body.body;
            for (const statement of statements) {
              parsed = this.parsePropertyAndMethodAsCommonJS(statement);
              parsed && members.push(parsed);
            }
          }
        }
        break;
      case 'VariableDeclaration':
        const declarations = node.declarations;
        for (const declaration of declarations) {
          parsed = this.parsePropertyAndMethodAsCommonJS(declaration);
          parsed && members.push(parsed);
        }
        break;
      case 'FunctionDeclaration':
        const statements = node.body.body;
        for (const statement of statements) {
          parsed = this.parsePropertyAndMethodAsCommonJS(statement);
          parsed && members.push(parsed);
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
              members.push({ name: left.property.name, node: left.property });
            } else if (left.object.type === 'MemberExpression') {
              let curLeft = left.object;
              while (curLeft.object.type === 'MemberExpression') {
                curLeft = curLeft.object;
              }
              if (curLeft.property.type === 'Identifier' &&
                  isCJSPrototype(curLeft.property.name) &&
                  left.property.type === 'Identifier') {
                // Return class method.
                let member = { name: left.property.name, node: node.expression.right };
                if (!(node.expression.right as FunctionExpression).id) {
                  renameFunctionNode(member.node as FunctionExpression, member.name);
                }
                members.push(member);
              }
            } else if (
              left.object.type === 'Identifier' &&
              isCJSPrototype(left.object.name) &&
              left.property.type === 'Identifier'
            ) {
              // Return class method.
              let member = { name: left.property.name, node: node.expression.right };
              if (!(node.expression.right as FunctionExpression).id) {
                renameFunctionNode(member.node as FunctionExpression, member.name);
              }
              members.push(member);
            }
          }
          if (right.type === 'FunctionExpression') {
            for (const statement of right.body.body) {
              parsed = this.parsePropertyAndMethodAsCommonJS(statement);
              parsed && members.push(parsed);
            }
          }
        }
        break;
      default:
        break;
    }
    return members.length > 0 ? members.flat() : undefined;
  }

  parseCommonNode(node: VariableDeclarator | ExpressionStatement): NodeWrapper[] {
    let members = ClassParser.parsePropertyAndMethodAsCommonJS(node);
    // Only if members is an array and members is not empty,
    // it means that the class has prototypes, and parse the members and methods from the class. 
    if (Array.isArray(members) && members.length > 0) {
      return members;
    }
    return undefined;
  }

  parse(): ASTNode[] {
    const node = this.astNode;

    let parsed;
    let className;
    let members;
    switch(node.type) {
      case 'ClassDeclaration':
        this._isClass = true;
        className = node.id.name;
        members = ClassParser.parsePropertyAndMethodAsESNext(node);
        members && (parsed = node);
        break;
      case 'VariableDeclaration':
        const declarator = node.declarations[0];
        members = this.parseCommonNode(declarator);
        if (members.length > 0) {
          // 如果赋值表达式右值为匿名 block 表达式，则认为是 class 声明
          this._isClass = isAnonymousFunction(declarator);
          className = (declarator.id as Identifier).name;
          parsed = declarator;
        }
        break;
      case 'VariableDeclarator':
        members = this.parseCommonNode(node);
        if (members.length > 0) {
          this._isClass = isAnonymousFunction(node);
          className = (node.id as Identifier).name;
          parsed = node;
        }
        break;
      case 'ExpressionStatement':
        members = this.parseCommonNode(node);
        if (members.length > 0) {
          // 如果赋值表达式右值为匿名 block 表达式，则认为是 class 声明
          this._isClass = isAnonymousFunction(members[0].node);
          className = members[0].name;
          parsed = node;
        }
        break;
      default:
        this._isClass = false;
        return undefined;
    }

    const astType = this.isClass ? ASTType.Class : ASTType.Other;
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
    ] as ASTNode[]).map(astNode => {
      astNode.name = className;
      astNode.astType = astType;
      astNode.node = parsed;
      return astNode;
    });
    return result;
  }
}

class FunctionParser extends ASTParser {
  protected _isFunction: boolean = false;

  public get isFunction() {
    return this._isFunction;
  }

  parse(): ASTNode[] {
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
    const result = ([
      {
        type: 'FunctionDeclaration',
      },
      {
        type: 'FunctionExpression',
      }
    ] as ASTNode[]).map(astNode => {
      astNode.name = functionName;
      astNode.astType = astType;
      astNode.node = node;
      return astNode;
    });
    return result;
  }
}

export { ASTParser, ASTType, ClassParser, FunctionParser };
export type { ASTNode };

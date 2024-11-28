import { Node, Identifier } from 'estree';

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
  /**
   * The class members
   */
  nodes: Record<string, Node>,
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

  parsePropertyAndMethodAsESNext(node: Node): NodeWrapper | NodeWrapper[] {
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

  parsePropertyAndMethodAsCommonJS(node: Node): NodeWrapper | NodeWrapper[] {
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
            } else if (
              left.object.type === 'Identifier' &&
              left.object.name === '_proto' &&
              left.property.type === 'Identifier'
            ) {
              // Return class method.
              members.push({ name: left.property.name, node: node.expression.right });
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

  parse(): ASTNode[] {
    const node = this.astNode;

    let parsed = [];
    let className;
    let members;
    switch(node.type) {
      case 'ClassDeclaration':
        this._isClass = true;
        className = node.id.name;
        members = this.parsePropertyAndMethodAsESNext(node);
        members && (parsed = parsed.concat(members));
        break;
      case 'VariableDeclarator':
        members = this.parsePropertyAndMethodAsCommonJS(node);
        // Only if members is an array and members is not empty,
        // it means that the class has prototypes, and parse the members and methods from the class. 
        if (Array.isArray(members) && members.length > 0) {
          this._isClass = true;
          className = (node.id as Identifier).name;
          parsed = parsed.concat(members);
        }
        break;
    }

    const astType = this.isClass ? ASTType.Class : ASTType.Other;
    const parsedWrapper = parsed.reduce((acc, cur) => {
      acc[cur.name] = cur.node;
      return acc;
    }, {} as Record<string, Node>);
    const result = ([
      {
        type: 'ClassDeclaration',
      },
      {
        type: 'ClassExpression',
      },
      {
        type: 'VariableDeclarator',
      }
    ] as ASTNode[]).map(node => {
      node.name = className;
      node.astType = astType;
      node.nodes = parsedWrapper;
      return node;
    })
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
    let parsed = [];
    let functionName;
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
        this._isFunction = true;
        functionName = node.id?.name;
        parsed.push(node);
        break;
    }

    const astType = this.isFunction ? ASTType.Function : ASTType.Other;
    const parsedWrapper = parsed.reduce((acc, cur) => {
      acc[cur.id.name] = cur;
      return acc;
    });
    const result = ([
      {
        type: 'FunctionDeclaration',
      },
      {
        type: 'FunctionExpression',
      }
    ] as ASTNode[]).map(node => {
      node.name = functionName;
      node.astType = astType;
      node.nodes = parsedWrapper;
      return node;
    });
    return result;
  }
}

export { ASTNode, ASTParser, ASTType, ClassParser, FunctionParser }

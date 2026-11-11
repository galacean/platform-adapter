import {
  Node,
  FunctionExpression,
} from 'estree';
import { isCJSPrototype, renameFunctionNode, getNodeName } from '../PluginUtils.js';
import ASTParser, { NodeWrapper, ASTNode, ASTNodeWrapper, ASTType } from './ASTParser.js';

export default class ClassParser extends ASTParser {
  /**
   * @param inFunction `node` is a statement of a constructor or method body, not of the class body. Only
   * `this.x = …` declares something there: a call is part of that function, not a member of the class.
   */
  static parseClassAsCJS(node: Node, className = '', inFunction = false): NodeWrapper {
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
          parsed = this.parseClassAsCJS(statement, className, true);
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
              parsed = this.parseClassAsCJS(statement, className, true);
              parsed && (Object.assign(members, parsed));
            }
          }
        } else if (node.expression.type === 'CallExpression' && !inFunction) {
          const callee = node.expression.callee;
          const accessors = ClassParser.parseAccessors(node.expression);
          if (accessors) {
            // `_create_class(Class, [{ key, get, set }, ...], [static ...])`: each accessor is its own member, so an
            // override replaces only the accessors it declares and keeps the rest of Engine's.
            Object.assign(members, accessors);
          } else if (callee.type === 'Identifier') {
            // Record the callee function name.
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

  /**
   * Accessors declared through the class helper `_create_class(Class, protoProps, staticProps)` (the helper may be
   * suffixed, e.g. `_create_class$2`), keyed `get/set <key>` and `static get/set <key>`.
   */
  static parseAccessors(call: Node): NodeWrapper | undefined {
    if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier' || !/^_create_class(\$\d+)?$/.test(call.callee.name)) {
      return undefined;
    }
    const members: NodeWrapper = {};
    const lists = [[call.arguments[1], 'get/set '], [call.arguments[2], 'static get/set ']] as const;
    for (const [list, prefix] of lists) {
      if (!list || list.type !== 'ArrayExpression') continue;
      for (const element of list.elements) {
        if (!element || element.type !== 'ObjectExpression') return undefined;
        const key = element.properties.find(
          (p) => p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'key'
        );
        if (!key || key.type !== 'Property' || key.value.type !== 'Literal') return undefined;
        Object.assign(members, { [prefix + String(key.value.value)]: element });
      }
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

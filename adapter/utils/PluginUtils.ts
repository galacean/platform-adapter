import { Node, FunctionExpression, Identifier } from 'estree';
import { generate } from 'escodegen';

const statementTypes = [
  'BlockStatement',
  'BreakStatement',
  'ContinueStatement',
  'DebuggerStatement',
  'DoWhileStatement',
  'EmptyStatement',
  'ExpressionStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'FunctionDeclaration',
  'IfStatement',
  'LabeledStatement',
  'ReturnStatement',
  'SwitchStatement',
  'ThrowStatement',
  'TryStatement',
  'VariableDeclaration',
  'WhileStatement',
  'WithStatement'
];

const expressionTypes = [
  'ArrayExpression',
  'ObjectExpression',
  'NewExpression',
  'CallExpression',
  'ThisExpression',
  'AwaitExpression',
  'ChainExpression',
  'ClassExpression',
  'UnaryExpression',
  'YieldExpression',
  'BinaryExpression',
  'ImportExpression',
  'MemberExpression',
  'UpdateExpression',
  'LogicalExpression',
  'ConditionalExpression',
  'AssignmentExpression',
  'SequenceExpression',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TaggedTemplateExpression'
];

function isReference(node, parent): boolean {
  if (node.type === 'MemberExpression') {
    return !node.computed && isReference(node.object, node);
  }

  if (node.type === 'Identifier') {
    // TODO is this right?
    if (parent.type === 'MemberExpression') return parent.computed || node === parent.object;

    // disregard the `bar` in { bar: foo }
    if ((parent.type === 'Property' || parent.type === 'PropertyDefinition') && node !== parent.value) return false;

    // disregard the `bar` in `class Foo { bar () {...} }`
    if (parent.type === 'MethodDefinition') return false;

    // disregard the `bar` in `export { foo as bar }`
    if (parent.type === 'ExportSpecifier' && node !== parent.local) return false;

    // disregard the `bar` in `import { bar as foo }`
    if (parent.type === 'ImportSpecifier' && node === parent.imported) {
      return false;
    }

    return true;
  }

  return false;
};

function isStatement(type: string): boolean {
  return statementTypes.includes(type);
}

function isExpression(type: string): boolean {
  return expressionTypes.includes(type);
}

function isCJSPrototype(name: string): boolean {
  return name === 'prototype' || name === '_proto' || name === 'exports';
}

function renameFunctionNode(node: FunctionExpression, name: string): void {
  node.id = { type: 'Identifier', name } as Identifier;
}

type MemberExpressionResult = { name: string, keypath: string};
function flatten(startNode: Node): MemberExpressionResult {
  const parts = [];
  let node = startNode;

  while (node.type === 'MemberExpression') {
    parts.unshift((node.property as Identifier).name);
    node = node.object;
  }

  const { name } = node as Identifier;
  parts.unshift(name);

  return { name, keypath: parts.join('.') };
};

function generateCode(node: Node): string {
  if (isStatement(node.type) || isExpression(node.type)) {
    return generate(node);
  } else {
    switch (node.type) {
      case 'PropertyDefinition':
        if (node.key.type === 'Identifier') {
          return node.key.name;
        }
        break;
      case 'MethodDefinition':
        return generate(node.value);
      case 'Identifier':
        return node.name;
      default:
        return '';
    }
  }
}

/**
 * Checks if the given JavaScript function is a function.
 *
 * @param {node} func - The function to check.
 * @returns {boolean} - Returns true if the node is function, false otherwise.
 *
 * @example
 * 
 * const func = function myFunc() {};
 * console.log(isFunction(func)); // true
 * 
 * const variable = "test";
 * console.log(isFunction(variable)); // false
 */
function isFunction(node: Node): boolean {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return true;
    case 'VariableDeclarator':
      return node.init && (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression');
    case 'CallExpression':
      return node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression';
    case 'MethodDefinition':
      return node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression';
    default:
      return false;
  }
}

/**
 * Checks if the given JavaScript function is an anonymous function.
 *
 * An anonymous function is one that does not have a name
 * associated with it. This function determines if the provided
 * input is a function and if it lacks a name.
 *
 * @param {node} func - The function to check.
 * @returns {boolean} - Returns true if the function is anonymous, false otherwise.
 *
 * @example
 * 
 * const namedFunc = function myFunc() {};
 * console.log(isAnonymousFunction(namedFunc)); // false
 * 
 * const anonymousFunc = function() {};
 * console.log(isAnonymousFunction(anonymousFunc)); // true
 */
function isAnonymousFunction(node: Node): boolean {
  switch (node.type) {
    case 'VariableDeclarator':
      if (node.init && node.init.type === 'CallExpression') {
        return node.init.callee.type === 'FunctionExpression' && (node.init.callee.id === null || node.init.callee.id.name === '');
      }
      return false;
    case 'CallExpression':
      return node.callee.type === 'FunctionExpression' && (node.callee.id === null || node.callee.id.name === '');
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      return node.id === null || node.id.name === '';
    default:
      return false;
  }
}

function getNodeName(node: Node) {
  let name = '';
  if (node.type === 'ExpressionStatement') {
    if (node.expression.type === 'AssignmentExpression') {
      const left = node.expression.left;
      if (left.type === 'MemberExpression') {
        if (left.object.type === 'Identifier' && left.property.type === 'Identifier') {
          name = left.property.name
        }
      }
    }
  } else {
    // @ts-ignore
    name = node.id ? node.id.name : node.name;
  }
  return name ?? '';
}

export {
  isReference,
  isStatement,
  isExpression,
  isCJSPrototype,
  flatten,
  generateCode,
  renameFunctionNode,
  isAnonymousFunction,
  isFunction,
  getNodeName
};

import { Node, ClassDeclaration, FunctionDeclaration, Identifier, VariableDeclarator } from 'estree';
import { generate } from 'escodegen';

function isReference(node, parent) {
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

function flatten(startNode) {
  const parts = [];
  let node = startNode;

  while (node.type === 'MemberExpression') {
    parts.unshift(node.property.name);
    node = node.object;
  }

  const { name } = node;
  parts.unshift(name);

  return { name, keypath: parts.join('.') };
};

function isStatement(type) {
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
  return statementTypes.includes(type);
}

function isExpression(type) {
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
  return expressionTypes.includes(type);
}

function generateCode(node: Node, start: number, end: number): string {
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
      default:
        return '';
    }
  }
}

export { isReference, flatten, generateCode };

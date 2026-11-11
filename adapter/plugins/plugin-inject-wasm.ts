import { walk } from 'estree-walker';
import { Plugin } from 'rollup';
import MagicString from 'magic-string';

// Asynchronous loading and compilation of a WebAssembly (WASM) module.
function instantiateArrayBuffer(receiver) {
  // @ts-ignore
  return WebAssembly.instantiate(wasmBinaryFile, info)
    .then(function(wasm) { 
      receiver(wasm);
     });
}

function instantiateAsync() {
  // @ts-ignore
  return instantiateArrayBuffer(receiveInstantiationResult);
}

// Synchronously loading and compilation of a WebAssembly (WASM) module.
function instantiateSync(file, info, receiver) {
  return WebAssembly.instantiate(file, info).then(function (wasm) {
    receiver(wasm['instance']);
  });
}

function createWasm() {
  var info = {
    // @ts-ignore
    "a": wasmImports
  };
  function receiveInstance(instance, module1) {
    // @ts-ignore
    wasmExports = instance.exports;
    // @ts-ignore
    wasmMemory = wasmExports["J"];
    // @ts-ignore
    updateMemoryViews();
    // @ts-ignore
    wasmTable = wasmExports["N"];
    // @ts-ignore
    addOnInit(wasmExports["K"]);
    // @ts-ignore
    removeRunDependency();
    // @ts-ignore
    return wasmExports;
  }
    // @ts-ignore
  addRunDependency();
  // @ts-ignore
  if (Module["instantiateWasm"]) {
    try {
      // @ts-ignore
      return Module["instantiateWasm"](info, receiveInstance);
    } catch (e) {
      // @ts-ignore
      err(`Module.instantiateWasm callback failed with error: ${e}`);
      // @ts-ignore
      readyPromiseReject(e);
    }
  }
  // @ts-ignore
  // Simulates asynchronous loading and compilation of a WebAssembly (WASM) module.
  instantiateSync(wasmBinaryFile, info, receiveInstance).catch(readyPromiseReject);
  return {}; // no exports yet; we'll fill them in later
}

/**
 * @param wasmName The name of the WebAssembly API. All WebAssembly strings will be replaced with this name.
 * @param modulesInjectWASM An array of modules that need to be injected with new WebAssembly function.
 * @returns Rollup plugin.
 */
export function injectWASM(wasmName: string, modulesInjectWASM?: string[]): Plugin {
  return {
    name: 'inject-wasm',
    transform(code: string, id: string) {
      if (modulesInjectWASM && modulesInjectWASM.find(module => {
        return id.endsWith(module);
      })) {
        const magicString = new MagicString(code);
        const ast = this.parse(code);
        let varName: string;
        const wasmPath = `/public/wasmSubpackage/${id.split('/').pop().split('.').slice(0, -1).join('.')}.wasm`;
        // Newer Emscripten glue (Engine 2.0's PhysX): `async createWasm()` awaits
        // `instantiateAsync(binary, binaryFile, imports)` and resolves the path through `findWasmBinary()`.
        const isAwaitGlue = /function findWasmBinary\s*\(/.test(code);
        let isAsnycCompileResolution = code.includes('instantiateAsync');
        const replaced = new Set<string>();
        // Source ranges this transform removed: nothing inside them is edited.
        const removed: Array<[number, number]> = [];
        walk(ast, {
          enter(node) {
            // @ts-ignore
            const start: number = node.start, end: number = node.end;
            if (removed.some(([from, to]) => start >= from && end <= to)) {
              this.skip();
              return;
            }
            // A mini-game never runs in Node, but Emscripten keeps its Node branch in the glue. Douyin's
            // compiler resolves every `require` when it compiles the game and rejects the branch's
            // `require("node:fs")` ("Can't resolve 'node:fs', unknown protocol"), so the game never starts.
            // Empty the branch instead of leaving it as dead code.
            if (node.type === 'VariableDeclarator' &&
              node.id.type === 'Identifier' &&
              node.id.name === 'ENVIRONMENT_IS_NODE' &&
              node.init
            ) {
              // @ts-ignore
              magicString.overwrite(node.init.start, node.init.end, 'false');
              this.skip();
              return;
            }
            if (node.type === 'IfStatement' &&
              node.test.type === 'Identifier' &&
              node.test.name === 'ENVIRONMENT_IS_NODE'
            ) {
              // Empty the branch and keep the statement. Removing the statement would hand its place to the
              // next one: `if (a) {} else if (ENVIRONMENT_IS_NODE) {}` followed by `x()` would run `x()` as the `else`.
              // The walk goes on into the `else` branch and patches what it contains.
              // @ts-ignore
              const from: number = node.consequent.start, to: number = node.consequent.end;
              magicString.overwrite(from, to, '{}');
              removed.push([from, to]);
              return;
            }
            if (node.type === 'AssignmentExpression' &&
              node.left.type === 'MemberExpression' &&
              node.left.object.type === 'Identifier' &&
              node.left.object.name === 'module' &&
              node.left.property.type === 'Identifier' &&
              node.left.property.name === 'exports' &&
              node.right.type === 'Identifier'
            ) {
              varName = node.right.name;
              this.skip();
            }

            if (node.type === 'FunctionDeclaration' && node.id) {
              if (isAwaitGlue) {
                if (node.id.name === 'findWasmBinary') {
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, `function findWasmBinary() { return ${JSON.stringify(wasmPath)}; }`);
                  replaced.add(node.id.name);
                } else if (node.id.name === 'instantiateAsync') {
                  // Mini-games instantiate local WASM by path: no fetch, streaming or ArrayBuffer.
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, `async function instantiateAsync(binary, binaryFile, imports) { return WebAssembly.instantiate(binaryFile, imports); }`);
                  replaced.add(node.id.name);
                }
              } else if (isAsnycCompileResolution) {
                  if (node.id.name === 'instantiateAsync') {
                    // @ts-ignore
                    magicString.overwrite(node.start, node.end, instantiateAsync.toString());
                  } else if (node.id.name === 'instantiateArrayBuffer') {
                    // @ts-ignore
                    magicString.overwrite(node.start, node.end, instantiateArrayBuffer.toString());
                  }
                }
              else {
                if (node.id.name === 'instantiateSync') {
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, instantiateSync.toString());
                } else if (node.id.name === 'createWasm') {
                  // @ts-ignore
                  magicString.overwrite(node.start, node.end, createWasm.toString());
                }
              }
            }
          }
        });
        if (isAwaitGlue && (!replaced.has('findWasmBinary') || !replaced.has('instantiateAsync'))) {
          this.error(`WASM loader '${id}' uses an unsupported Emscripten glue: findWasmBinary/instantiateAsync not found.`);
        }

        code = magicString.toString();
        code = code.replace(/wasmBinaryFile\s*=\s*(['"])[^'"]*\1/, `wasmBinaryFile="${wasmPath}"`);
        code = code.replace(`WebAssembly.RuntimeError`, `Error`);
        if (varName) {
          code = code.concat(`window.${varName} = ${varName}`);
        }
      }

      if (wasmName) {
        code = code.replace(/WebAssembly/g, wasmName);
        code = code.replace(/typeof WebAssembly/g, `typeof ${wasmName}`);
      }
      return { code, map: null };
    }
  }
}

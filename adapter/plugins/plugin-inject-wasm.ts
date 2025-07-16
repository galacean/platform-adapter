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
        let isAsnycCompileResolution = code.includes('instantiateAsync');
        walk(ast, {
          enter(node) {
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
              if (isAsnycCompileResolution) {
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

        code = magicString.toString();
        code = code.replace(/wasmBinaryFile\s*=\s*(['"])[^'"]*\1/, `wasmBinaryFile="/public/wasmSubpackage/${id.split('/').pop().split('.').slice(0, -1).join('.')}.wasm"`);
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

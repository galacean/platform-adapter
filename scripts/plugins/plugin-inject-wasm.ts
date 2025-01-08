import { walk } from 'estree-walker';
import { Plugin } from 'rollup';
import MagicString from 'magic-string';

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
        walk(ast, {
          enter(node) {
            if (node.type === 'FunctionDeclaration' &&
                node.id &&
                (
                  node.id.name === 'instantiateAsync' ||
                  node.id.name === 'instantiateArrayBuffer'
                )
            ) {
              if (node.id.name === 'instantiateAsync') {
                // @ts-ignore
                magicString.overwrite(node.start, node.end, instantiateAsync.toString());
              } else if (node.id.name === 'instantiateArrayBuffer') {
                // @ts-ignore
                magicString.overwrite(node.start, node.end, instantiateArrayBuffer.toString());
              }
            }
          },
          leave(node) {
            code = magicString.toString();
            code = code.replace(/wasmBinaryFile="([^"]*)"/, `wasmBinaryFile="/public/physx.release.wasm"`);
            code = code.replace(`WebAssembly.RuntimeError`, `Error`);
            code = code.concat(`window.PHYSX = PHYSX`);
          }
        });
      }

      if (wasmName) {
        code = code.replace(/WebAssembly/g, wasmName);
        code = code.replace(/typeof WebAssembly/g, `typeof ${wasmName}`);
      }
      return { code, map: null };
    }
  }
}

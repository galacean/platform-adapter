import { walk } from 'estree-walker';

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

export function injectWASM(injectModules: string[]) {
  return {
    name: 'inject-wasm',
    transform(code: string, id: string) {
      if (injectModules.find(module => {
        return id.endsWith(module);
      })) {
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
                code = code.replace(code.slice(node.start, node.end), instantiateAsync.toString());
              } else if (node.id.name === 'instantiateArrayBuffer') {
                // @ts-ignore
                code = code.replace(code.slice(node.start, node.end), instantiateArrayBuffer.toString());
              }
            }
          }
        });
      }
      return { code, map: null };
    }
  }
}

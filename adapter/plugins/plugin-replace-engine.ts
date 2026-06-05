import { Plugin } from 'rollup';

export function pluginReplaceGalaceanLogic(): Plugin {
  return {
    name: 'replaceGalaceanLogic',
    transform(code: string, id: string) {
      if (id.indexOf('@galacean') > -1) {
        code = code.replace(
          `gl[_glKey] = extensionVal;`,
          `try { gl[_glKey] = extensionVal; } catch (e) { console.error(e); }`,
        );
        code = code.replace(
          `this._requireResult = {};`,
          `this._requireResult = Object.assign({}, $defaultWebGLExtensions)`,
        );
      }
      return { code };
    }
  };
}

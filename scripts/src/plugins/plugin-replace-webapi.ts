import inject from './plugin-inject-global.js';

export function pluginReplaceWebAPI(entry: string, injectName: string, injectNamePostfix: string, apiList: string[]) {
  return inject(
    {
      modules: apiList.reduce((acc, curr) => {
        const injectSetting = {
          globalVarName: entry,
          localName: injectName,
          localNamePostfix: injectNamePostfix.concat(`.${curr}`),
          overwrite: true,
        };

        acc[curr] = injectSetting;
        acc[`self.${curr}`] = injectSetting;

        return acc;
      }, {}),
    }
  );
}

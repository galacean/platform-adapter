import BundleTaskFactory, { BundleTaskSettings } from './bundle/BundleTask.js';
import { parseArgs } from './cli.js';

(async function bundleAdapter() {
  let buildSettings;
  try {
    const envCfg = process.env['ADAPTER_BUNDLE_SETTINGS'];
    if (envCfg) {
      buildSettings = JSON.parse(process.env['ADAPTER_BUNDLE_SETTINGS']);
    } else {
      if (!buildSettings) {
        const { polyfill, engine, jsWASMLoader, output } = parseArgs();
        buildSettings = {
          polyfill: polyfill,
          engine: engine,
          jsWASMLoader: jsWASMLoader,
          output: output
        } as BundleTaskSettings;
      }
    }
  } catch (e) {
    console.warn("The environment variable ADAPTER_BUNDLE_SETTINGS is not a valid JSON string.");
    process.exit(1);
  }

  try {
    let tasks = BundleTaskFactory.createBundleTask(buildSettings);
    if (tasks) {
      for (const task of tasks) {
        await task.run();
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}());

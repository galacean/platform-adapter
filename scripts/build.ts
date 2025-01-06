import BundleTaskFactory, { BundleTaskSettings } from './bundle/BundleTask.js';
import { parseArgs } from './cli.js';

(async function bundleAdapter() {
  let buildSettings;
  try {
    const envCfg = process.env['ADAPTER_BUNDLE_SETTINGS'];
    if (envCfg) {
      buildSettings = JSON.parse(process.env['ADAPTER_BUNDLE_SETTINGS']);
      !buildSettings.output && (buildSettings.output = buildSettings.outputDir);
    } else {
      if (!buildSettings) {
        const { polyfill, engine, wasm, jsWASMLoader, output } = parseArgs();
        buildSettings = {
          polyfill: polyfill,
          engine: engine,
          wasm: wasm,
          jsWASMLoader: jsWASMLoader,
          output: output
        } as BundleTaskSettings;
      }
    }
  } catch (e) {
    console.warn("CLI arguments are not supported or environment variable ADAPTER_BUNDLE_SETTINGS not a valid JSON.");
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

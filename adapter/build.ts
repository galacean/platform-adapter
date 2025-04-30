import chalk from 'chalk';
import BundleTaskFactory from './bundle/BundleTask.js';
import { parseArgs } from './cli.js';

(async function bundleAdapter() {
  let buildSettings;
  try {
    const envCfg = process.env['ADAPTER_BUNDLE_SETTINGS'];
    if (envCfg) {
      buildSettings = JSON.parse(envCfg);
      !buildSettings.output && (buildSettings.output = buildSettings.outputDir);
    } else {
      !buildSettings && (buildSettings = parseArgs());
      !buildSettings.output && (buildSettings.output = buildSettings.outputDir);
    }
  } catch (e) {
    console.warn("CLI arguments are not supported or environment variable ADAPTER_BUNDLE_SETTINGS not a valid JSON.");
    process.exit(1);
  }

  try {
    let tasks = BundleTaskFactory.createBundleTask(buildSettings);
    if (tasks) {
      for (const task of tasks) {
        await task.run(buildSettings);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error(chalk.red(e.message));
    process.exit(1);
  }
}());

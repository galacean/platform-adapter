import BundleTaskFactory from './bundle/BundleTask.js';

(async function bundleAdapter() {
  let buildSettings;
  try {
    buildSettings = JSON.parse(process.env['ADAPTER_BUNDLE_SETTINGS']);
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

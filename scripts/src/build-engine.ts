import BundleTaskFactory from './bundle/BundleTask.js';

(async function bundleEngine() {
  try {
    let tasks = BundleTaskFactory.createBundleTask(['Engine']);
    for (const task of tasks) {
      await task.run();
    }

    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}());

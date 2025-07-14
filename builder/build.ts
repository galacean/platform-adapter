import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

import { parseArgs, rootDir } from './cli.js';
import { loadPackageJson, normalizePath } from './utils/Utils.js';
import BuildSettings from './build/BuildSettings.js';
import BuildTask from './build/BuildTask.js';

(async function build() {
  let buildSettings: BuildSettings | undefined = undefined;
  try {
    const envCfg = process.env['PROJ_BUILD_SETTINGS'];
    if (envCfg) {
      buildSettings = JSON.parse(envCfg) as BuildSettings;
    } else {
      if (!buildSettings) {
        buildSettings = parseArgs();
      }
    }
  } catch (e) {
    console.warn("CLI arguments are not supported or environment variable PROJ_BUILD_SETTINGS not a valid JSON.");
    process.exit(1);
  }

  try {
    const cwd = process.cwd();
    if (!buildSettings.project) {
      buildSettings.project = cwd;
    }
    const projectPath = path.resolve(buildSettings.project);
    if (!fs.pathExistsSync(projectPath)) {
      throw Error(`Project path not found: ${projectPath}`);
    }

    const Platform = loadPackageJson(path.join(rootDir, "config/platform.json"));
    const wasmConfig = loadPackageJson(path.join(rootDir, "config/wasm-builder.json"));

    if (!(buildSettings.app in Platform) || !(buildSettings.platform in Platform[buildSettings.app])) {
      throw Error(`Unsupported platform: ${buildSettings.platform} ${buildSettings.app} `);
    }

    const platformConfig = Platform[buildSettings.app][buildSettings.platform];
    const configuredAssets = platformConfig.assets as string[];
    const configFiles = platformConfig.configFiles as string[];

    // Append exist assets and config files into buildSettings.assets;
    const buildSettingsAssets = buildSettings.assets = buildSettings.assets ?? [];
    function appendAsset(asset: string) {
      const assetPath = path.join(projectPath, asset);
      if (fs.existsSync(assetPath)) {
        buildSettingsAssets.push(assetPath);
      }
    }
    configuredAssets?.forEach(appendAsset);
    configFiles?.forEach(appendAsset);

    // Prepare dependencies and wasm modules if packageJson exists.
    const packageJson = loadPackageJson(path.join(projectPath, platformConfig.packageJson));
    if (packageJson) {
      if (!buildSettings.output) {
        buildSettings.output = packageJson.name;
      }
      if (!buildSettings.entry) {
        buildSettings.entry = packageJson.main;
      }

      // Prepare wasm modules
      buildSettings.dependencies = [];
      buildSettings.wasm = [];
      const wasmModules = Object.keys(wasmConfig);
      let wasmConfigJson = { ...wasmConfig, }
      if (buildSettings.extraWASM) {
        const extraWASM = loadPackageJson(path.join(projectPath, buildSettings.extraWASM));
        if (extraWASM) {
          wasmModules.push(...Object.keys(extraWASM));
          wasmConfigJson = { ...wasmConfigJson, ...extraWASM };
        }
      }

      const dependencies = packageJson.dependencies;
      for (const dependency in dependencies) {
        const dependencyPath = normalizePath(path.join(projectPath, 'node_modules', dependency)) ;
        if (fs.pathExistsSync(dependencyPath)) {
          buildSettings.dependencies.push(dependencyPath);
          const wasmModule = wasmModules.find(moduleName => moduleName === dependency);
          if (wasmModule) {
            const wasmBinary = path.join(dependencyPath, wasmConfigJson[wasmModule].wasmBinary);
            const loader = path.join(dependencyPath, wasmConfigJson[wasmModule].loader);
            buildSettings.wasm.push({
              wasmBinary,
              loader
            });
          }
        }
      }
    }

    const task = new BuildTask(buildSettings);
    await task.run();

    if (!buildSettings.output) {
      throw Error(`Output path not found: ${buildSettings.output}`);
    }

    process.exit(0);
  } catch (e) {
    console.error(chalk.red(e.message));
    process.exit(1);
  }
}());

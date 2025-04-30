import path from 'path';
import fs from 'fs-extra';

import Platform from './config/platform.json' assert { type: 'json' };
import wasmConfig from './config/wasm-builder.json' assert { type: 'json' };
import { parseArgs } from './cli.js';
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

    const platformConfig = Platform[buildSettings.app][buildSettings.platform];

    const stdAssets = platformConfig.assets as string[];
    const stdConfigFiles = platformConfig.configFiles as string[];

    // Filter exist assets and config files into buildSettings.assets;
    stdAssets.forEach((asset) => {
      const assetPath = path.join(projectPath, asset);
      if (fs.existsSync(assetPath)) {
        buildSettings.assets.push(assetPath);
      }
    });
    stdConfigFiles.forEach((configFile) => {
      const configFilePath = path.join(projectPath, configFile);
      if (fs.existsSync(configFilePath)) {
        buildSettings.assets.push(configFilePath);
      }
    });

    const packageJson = loadPackageJson(path.join(projectPath, platformConfig.packageJson));
    if (packageJson) {
      if (!buildSettings.output) {
        buildSettings.output = packageJson.name;
      }
      if (!buildSettings.entry) {
        buildSettings.entry = packageJson.main;
      }
      if (!buildSettings.dependencies || buildSettings.dependencies.length === 0) {
        const wasmModules = Object.keys(wasmConfig);
        let wasmConfigJson = { ...wasmConfig, }
        if (buildSettings.extralWASM) {
          const extralWASM = loadPackageJson(path.join(projectPath, buildSettings.extralWASM));
          if (extralWASM) {
            wasmModules.push(...Object.keys(extralWASM));
            wasmConfigJson = { ...wasmConfigJson, ...extralWASM };
          }
        }

        buildSettings.dependencies = [];
        buildSettings.wasm = [];
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
    }

    const task = new BuildTask(buildSettings);
    await task.run();

    if (!buildSettings.output) {
      throw Error(`Output path not found: ${buildSettings.output}`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}());

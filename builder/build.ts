import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

import { parseArgs, rootDir } from './cli.js';
import { loadPackageJson, normalizePath } from './utils/Utils.js';
import BuildSettings, { WASMWrapper } from './build/BuildSettings.js';
import BuildTask from './build/BuildTask.js';

/**
 * Push wasm modules into the source array.
 * @param source The wasm modules array to be filled
 * @param target The wasm modules to be pushed, can be an array or a single object
 * @param searchPath The root path to search for the wasm modules
 * @returns The updated source array with the wasm modules pushed
 */
function pushWASMElements(source: WASMWrapper[], target: WASMWrapper | WASMWrapper[], searchPath: string): WASMWrapper[] {
  if (Array.isArray(target)) {
    target.forEach(item => {
      source.push({
        wasmBinary: path.join(searchPath, item.wasmBinary),
        loader: path.join(searchPath, item.loader)
      });
    });
  } else if (typeof target === 'object') {
    source.push({
      wasmBinary: path.join(searchPath, target.wasmBinary),
      loader: path.join(searchPath, target.loader)
    });
  }
  return source;
}

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
    const wasmPackage = loadPackageJson(path.join(rootDir, "config/wasm-package.json"));
    if (packageJson) {
      if (!buildSettings.output) {
        buildSettings.output = packageJson.name;
      }
      if (!buildSettings.entry) {
        buildSettings.entry = packageJson.main;
      }

      const npmPath = path.join(projectPath, "node_modules");
      // Prepare wasm modules
      buildSettings.dependencies = [];
      buildSettings.wasm = [] as WASMWrapper[];
      if (buildSettings.extraWASM) {
        const extraWASM = loadPackageJson(path.join(projectPath, buildSettings.extraWASM));
        if (extraWASM) {
          // If extraWASM contains "engine", merge wasm-package into wasmModules.
          const extraWASMKeys = Object.keys(extraWASM);
          if (extraWASMKeys.includes("engine")) {
            extraWASMKeys.splice(extraWASMKeys.indexOf("engine"), 1);
            const engineWASM = extraWASM["engine"];
            const wasms = buildSettings.wasm;
            for (const engineFeatureKey in engineWASM) {
              if (engineFeatureKey in wasmPackage) {
                for (const wasmPackageKey in wasmPackage[engineFeatureKey]) {
                  pushWASMElements(wasms, wasmPackage[engineFeatureKey][wasmPackageKey], path.join(npmPath, wasmPackageKey));
                }
              }
            }
          }
          extraWASMKeys.forEach(wasmKey => {
            pushWASMElements(buildSettings.wasm, extraWASM[wasmKey], projectPath);
          });
        }

        const dependencies = buildSettings.dependencies;
        for (const dependency in packageJson.dependencies) {
          const dependencyPath = normalizePath(path.join(npmPath, dependency)) ;
          if (fs.pathExistsSync(dependencyPath)) {
            dependencies.push(dependencyPath);
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

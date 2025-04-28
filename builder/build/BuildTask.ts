import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { rollup } from 'rollup';
import copy from 'rollup-plugin-copy';
import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import swc from '@rollup/plugin-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { exec } from 'child_process';
import { promisify } from 'util';

import BuildSettings from './BuildSettings.js';
import { createResolveMatcher, getRelativePath, getSubDirRelativePath, loadPackageJson, normalizePath } from '../utils/Utils.js';
import Package from './Package.js';
import rebuildDependency from '../plugin/plugin-rebuild-dependency.js';

type BuildParams = {
  [key: string]: any,
  input: string[],
  copyAssets?: Array<{ src: string, dest: string }>,
  dependencies?: Array<{ find: string, replacement: string }>,
  external?: string[],
}

function parseDependencies(modules: string): Package | null {
  console.log(chalk.yellow(`Start parse engine module '${modules}'`));
  const packageJson = loadPackageJson(path.join(modules, 'package.json'));
  if (!packageJson) {
    return null;
  }
  return packageJson as Package;
}

class BuildTask {
  private _dependencyPath = 'dependencies';
  private _outputDependencyPath: string;

  constructor(private _buildSettings: BuildSettings) {
    this._outputDependencyPath = path.join(_buildSettings.output!, this._dependencyPath);
  }

  public async run(): Promise<void> {
    const buildSettings = this._buildSettings;
    const dependencyPath = this._dependencyPath;

    let input: Array<string> = [];
    if (buildSettings.entry) {
      input.push(buildSettings.entry);
    }
    if (buildSettings.subpackages && buildSettings.subpackages.length > 0) {
      input.push(...buildSettings.subpackages);
    }
    input = input.map(entry => {
      return path.join(buildSettings.project!, entry);
    })
    .filter(path => {
      const exist = fs.pathExistsSync(path);
      if (!exist) {
        console.log(chalk.red(`Entry '${path}' does not exist.`));
      }
      return exist;
    });
    if (input.length === 0) {
      console.log(chalk.yellow('No entries found. Skipping build.'));
      return;
    }

    const copyAssets: Array<{ src: string, dest: string }> = [];

    if (buildSettings.assets && buildSettings.assets.length > 0) {
      copyAssets.push(...buildSettings.assets.map(asset => {
        const dest = path.join(buildSettings.output!, getRelativePath(buildSettings.project!, path.dirname(asset)));
        console.log(chalk.blue(`Copy assets '${asset}' to '${dest}'`));
        return { src: asset, dest: buildSettings.output! };
      }));
    }

    let external: any[] = [];
    let mappingDependencies: Array<{ find: string, replacement: string }> = [];
    buildSettings.dependencies?.forEach(_dependency => {
      const packageInfo = parseDependencies(_dependency);
      if (packageInfo) {
        const dependencyName = packageInfo.browser ?? packageInfo.main;
        const src = path.join(_dependency, packageInfo.browser ?? packageInfo.main);
        const dependency = packageInfo.name;
        const dest = path.join(buildSettings.output!, path.join(dependencyPath, dependency));
        copyAssets.push({ src, dest });
        console.log(chalk.blue(`Copy dependencies '${src}' to '${dest}'`));
        const basename = path.basename(dependencyName);
        mappingDependencies.push({ find: packageInfo.name, replacement: path.join(dependency, basename) });
      }
    });

    // Prepare webassembly files
    const wasmloaders = [];
    if (buildSettings.wasm && buildSettings.wasm.length > 0) {
      const wasmSubpackageDir = path.join(buildSettings.output!, 'public/wasmSubpackage');
      fs.ensureDirSync(wasmSubpackageDir);
      fs.ensureFileSync(path.join(wasmSubpackageDir, 'game.js'));
      buildSettings.wasm.forEach(_wasm => {
        let src = _wasm.wasmBinary;
        let dest = wasmSubpackageDir;
        console.log(chalk.blue(`Copy webassembly '${src}' to '${dest}'`));
        copyAssets.push({ src, dest });

        src = _wasm.loader;
        dest = buildSettings.output!;
        console.log(chalk.blue(`Copy webassembly loader '${src}' to '${dest}'`));
        copyAssets.push({ src, dest });
        const filename = path.basename(src);
        wasmloaders.push(filename);

        // Treat webassembly loader as external dependency
        external.push(createResolveMatcher(filename));
      });
    }

    // Treat polyfill as external dependency
    external.push(createResolveMatcher('polyfill'));
    external = external.flat();

    const buildParams: BuildParams = {
      input,
      external,
      dependencies: mappingDependencies,
      copyAssets,
      wasmloaders,
    };

    console.log(chalk.green(`Start build project`));

    console.time(chalk.magenta(`Bundle project complete, total time`));
    await this.buildProject(buildParams);
    console.timeEnd(chalk.magenta(`Bundle project complete, total time`));

    console.time(chalk.magenta(`Bundle dependencies complete, total time`));
    await this.buildDependencies(buildParams);
    console.timeEnd(chalk.magenta(`Bundle dependencies complete, total time`));

    console.time(chalk.magenta(`Adapt dependencies complete, total time`));
    await this.adaptDependencies(buildParams);
    console.timeEnd(chalk.magenta(`Adapt dependencies complete, total time`));

    console.log(chalk.green(`Build project complete.`));
  }

  /**
   * Build the project and its dependencies.
   * @param buildParams Build parameters containing the input files, copy assets, and external dependencies.
   * @returns 
   */
  private async buildProject(buildParams: BuildParams): Promise<void> {
    const buildSettings = this._buildSettings;
    const dependencyPath = this._dependencyPath;
    return rollup({
      input: buildParams.input,
      plugins: [
        alias({
          entries: buildParams.dependencies,
          customResolver: function (id, importer) {
            return {
              id: normalizePath(getSubDirRelativePath(buildSettings.project!, importer) + path.join(dependencyPath, id)),
              external: true
            }
          }
        }),
        resolve({
          extensions: ['.js', '.ts'],
          allowExportsFolderMapping: true,
        }),
        swc({
          swc: {
            swcrc: false,
            jsc: {
              target: 'esnext',
              transform: {
                useDefineForClassFields: true,
              },
              parser: {
                syntax: 'typescript',
                decorators: true,
              },
            },
            minify: !!buildSettings.minify
          },
          exclude: ['physx.release.js']
        }),
        copy({
          targets: buildParams.copyAssets
        }),
        buildSettings.visualizer && visualizer({
          filename: path.join(buildSettings.project, '.trash', 'project.html'),
          template: 'treemap',
          gzipSize: true,
          open: true,
        })
      ],
      external: buildParams.external,
      onwarn(warning) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        console.warn(warning.message);
      }
    })
    .then(async (bundled) => {
      await bundled.write({
        dir: buildSettings.output,
        format: 'es',
        sourcemap: !!buildSettings.sourcemap,
        preserveModules: true,
        preserveModulesRoot: buildSettings.output,
        esModule: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        exports: 'named',
      });
      await bundled.close();
    })
    .catch(err => {
      throw err;
    });
  }

  /**
   * Remap dependencies references to the output of the project.
   * @param buildParams Build parameters containing the dependencies to be remapped.
   */
  private async buildDependencies(buildParams: BuildParams): Promise<void> {
    if (!buildParams.dependencies) {
      return;
    }
    const buildSettings = this._buildSettings;
    const outputDependencyPath = this._outputDependencyPath;
    const dependencyPath = this._dependencyPath;
    const input = buildParams.dependencies.map(dependency => {
      const replacement = dependency.replacement;
      const inputFile = path.join(buildSettings.output!, dependencyPath, replacement);
      if (fs.pathExistsSync(inputFile)) {
        dependency.replacement = normalizePath(getSubDirRelativePath(outputDependencyPath, inputFile) + replacement);
        return inputFile;
      }
      return '';
    }).filter(p => p);
    return rollup({
      input,
      plugins: [
        rebuildDependency(buildParams.dependencies),
        buildSettings.visualizer && visualizer({
          filename: path.join(buildSettings.project, '.trash', 'dependency.html'),
          template: 'treemap',
          gzipSize: true,
          open: true,
        })
      ],
      onwarn(warning) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        console.warn(warning.message);
      }
    })
    .then(async (bundled) => {
      await bundled.write({
        dir: outputDependencyPath,
        format: 'es',
        sourcemap: !!buildSettings.sourcemap,
        preserveModules: true,
        preserveModulesRoot: outputDependencyPath,
        esModule: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      });
      await bundled.close();
    })
    .catch(err => {
      throw err;
    });
  }

  /**
   * Adapt dependencies to the output of the project.
   * @param buildParams Build parameters containing the dependencies to be adapted.
   */
  private async adaptDependencies(buildParams: BuildParams) {
    if (!buildParams.dependencies) {
      return;
    }
    const { _dependencyPath, _buildSettings } = this;
    const adaptEngines = buildParams.dependencies.filter(({ find }) => {
      return find.indexOf('@galacean') !== -1;
    })
    .map(({ find, replacement }) => {
      return path.join(_dependencyPath, find, path.basename(replacement));
    })
    .join(' ');
    const adaptDeps = buildParams.dependencies.filter(({ find }) => {
      return find.indexOf('@galacean') === -1;
    })
    .map(({ find, replacement }) => {
      return path.join(_dependencyPath, find, path.basename(replacement));
    })
    .join(' ');
    const adaptWASMLoaders = buildParams.wasmloaders.join(' ');

    const result = await promisify(exec)([
      'npx platform-adapter',
      '--polyfill true',
      adaptEngines && `--engine ${adaptEngines}`,
      adaptDeps && `--dependency ${adaptDeps}`,
      adaptWASMLoaders && `--jsWASMLoader ${adaptWASMLoaders}`,
      `--platform ${_buildSettings.platform}`,
      `--app ${_buildSettings.app}`,
      `--root ${_buildSettings.output}`,
      `--output ${_buildSettings.output}`,
      `--sourcemap ${_buildSettings.sourcemap}`,
      `--minify ${_buildSettings.minify}`,
    ]
    .filter(p => p)
    .join(' '));

    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.log(result.stderr);
    }
  }
}

export default BuildTask;

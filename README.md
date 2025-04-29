# Galacean Engine Multi-Platform Adaptation

Building the Galacean ecosystem to support adaption for mini-games, applets, and other multi-platform applications.

## Usage

### CLI
There are multiple CLI tools in this repository, including tools for adapting engine and building editor project:
  - `platform-adapter`
  - `project-builder`

Before using the CLI, ensure that you have installed the engine dependencies of the supported version if needed, such as `@galacean/engine`.

- **Install Dependencies**
  ```shell
  npm install @galacean/platform-adapter
  ```

- **Run CLI**

  If you more like to use the CLI, you can run the following commands.

  - **Bundle the engine and polyfill**

    ```shell
    npx platform-adapter --p true --e @galacean/engine/dist/browser.js @galacean/engine-spine/dist/browser.js --w @galacean/engine-physics-physx/lib/physx.release.wasm --wasmLoader @galacean/engine-physics-physx/lib/physx.release.js --o ./dist
    ```

  - **Build the editor project**

    ```shell
    npx project-builder --project . --entry game.ts -o dist --platform wechat --app minigame
    ```

  Not all params need to option. Use the `--help` option to view the available commands and options.

  [CLI Description](#CLI)

<a id="CLI"></a>
### Description Of `CLI`

#### platform-adapter

- `--p`, `--polyfill`: Whether to bundle the polyfill, if using custom engine components, this option can be set to false.
- `--e`, `--engine`: The engine modules to bundle, specified as a list of engine module file paths, use a blank space to separate each path. If array is empty, the engine will not be bundled.
- `--w`, `--wasm`: The wasm file to be upload.
- `--wl`, `--jsWASMLoader`: The wasm loader for the engine, use a blank space to separate each path. If array is empty, the jsWASMLoader will not be bundled.
- `--r`, `--root`: The root directory of the build, if not specified, the current working directory will be used.
- `--o`, `--output`: The output directory for the bundled files, if not specified, the bundled files will be placed in the same directory as the action.yaml.
- `--dependency`: The dependency entries of third npm packages, e.g. `@tweenjs/tween.js`.
- `--platform`: Specify the platform to build, e.g. `wechat`. Default to `all` will build all platforms.
- `--app`: Specify the app to build, e.g. `minigame` and `miniprogram`. Default to `all` will build all apps.
- `--sourcemap`: Enable sourcemap generation. Default to `false`.
- `--minify`: Enable minify generation. Default to `false`.

**Note**: The engine modules and jsWASMLoader should contains `@galacean/xxx/' as name, otherwise the build process will fail.

#### project-builder

- `--project`: The project directory to build. Default to the current working directory.
- `--entry`: The entry file of the project. Default to the main field in package.json.
- `--subpackages`: The subpackage entries. Enable to add your own modules to the build process.
- `--assets`: The assets directory to copy. Default to the public directory in the project.
- `--o`, `--output`: The output directory for the build result. Default to the name field in package.json.
- `--p`, `--platform`: Specify the platform to build, e.g. `wechat`. Default to `wechat`.
- `--app`: Specify the app to build, e.g. `minigame` and `miniprogram`. Default to `minigame`.
- `--sourcemap`: Enable sourcemap generation. Default to `false`.
- `--minify`: Enable minify generation. Default to `false`.
- `--v`, `--visualizer`: Enable visualize build result. You can find them under the path of $project/.trash and remove them safely. Default to `false`.

### Output

#### platform-adapter

```shell
dist/
  - ${platformName}/ # Platform name, e.g. WeChat: wechat
    - minigame/ # Mini-game platform
      - galacean-js/ # Engine output
        - engine.js
        - ...
      - polyfill.js # Platform-specific WebAPI
    - miniprogram/ # Mini-program platform
      - ...
```

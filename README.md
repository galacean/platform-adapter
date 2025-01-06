# Galacean Engine Multi-Platform Adaptation

Building the Galacean ecosystem to support adaption for mini-games, applets, and other multi-platform applications.

## Usage

### CLI
Before using the CLI, ensure that you have installed the engine dependencies of the supported version if needed, such as `@galacean/engine`.

- **Install Dependencies**
  ```shell
  npm install @galacean/platform-adapter
  ```

- **Run CLI**

  If you more like to use the CLI, you can run the following command to bundle the engine and polyfill.

  ```shell
  npx platform-adapter --p true --e @galacean/engine/dist/browser.js @galacean/engine-spine/dist/browser.js --w @galacean/engine-physics-physx/lib/physx.release.wasm --wasmLoader @galacean/engine-physics-physx/lib/physx.release.js --o ./dist
  ```

  Not all params need to option. Use the `--help` option to view the available commands and options.

  [CLI Description](#CLI)

<a id="CLI"></a>
**Description Of `CLI` And `ADAPTER_BUNDLE_SETTINGS`**
  - `--p`, `--polyfill`: Whether to bundle the polyfill, if using custom engine components, this option can be set to false.
  - `--e`, `--engine`: The engine modules to bundle, specified as a list of engine module file paths, use a blank space to separate each path. If array is empty, the engine will not be bundled.
  - `--w`, `--wasm`: The wasm file to be upload.
  - `--wl`, `--jsWASMLoader`: The wasm loader for the engine, use a blank space to separate each path. If array is empty, the jsWASMLoader will not be bundled.
  - `--o`, `--output`: The output directory for the bundled files, if not specified, the bundled files will be placed in the same directory as the action.yaml.

    **Note**: The engine modules and jsWASMLoader should contains `@galacean/xxx/' as name, otherwise the build will fail.

### Output
```shell
dist/
  - ${platformName}/ # Platform name, e.g., WeChat: wechat
    - minigame/ # Mini-game platform
      - galacean-js/ # Engine output
        - engine.js
        - ...
      - polyfill.js # Platform-specific WebAPI
    - miniprogram/ # Mini-program platform
      - ...
```
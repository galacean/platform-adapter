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
  npx platform-adapter --p true --e @galacean/engine/dist/module.js --wasm @galacean/engine-physics-physx/lib/physx.release.js --o ./dist
  ```

  Not all params need to option. Use the `--help` option to view the available commands and options.

- **Set Up Node Environment Variables**

  If you don't want to use the CLI, you can also set up the environment variables in your project's `package.json` file.
  ``` json
  "ADAPTER_BUNDLE_SETTINGS": {
    "polyfill": true,
    "engine": [
      "@galacean/engine/dist/module.js",
      "@galacean/engine-lottie/dist/module.js",
      "@galacean/engine-physics-lite/dist/module.js",
      "@galacean/engine-physics-physx/dist/module.js",
      "@galacean/engine-shader-lab/dist/module.js",
      "@galacean/engine-spine/dist/module.js",
      "@galacean/engine-toolkit/dist/es/index.js",
      "@galacean/engine-xr/dist/module.js"
    ],
    "jsWASMLoader": [
      "@galacean/engine-physics-physx/libs/physx.release.js"
    ],
    "output": "./"
  }
  ```

**Description Of `ADAPTER_BUNDLE_SETTINGS`**
  - `polyfill`: Whether to bundle the polyfill, if using custom engine components, this option can be set to false.
  - `engine`: The engine modules to bundle, specified as a list of engine module file paths, if array is empty, the engine will not be bundled.
  - `jsWASMLoader`: The wasm loader for the engine, if array is empty, the jsWASMLoader will not be bundled.
  - `output`: The output directory for the bundled files, if not specified, the bundled files will be placed in the same directory as the action.yaml.

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

### Build Script

The `scripts` directory contains build scripts used to generate platform adapters and engine adapters:
  - `build.ts`: Generates the `Polyfill` and engine adaptation code.

After modifying the build scripts, execute following command to build the scripts:
```shell
npm run build:cli
```

### Platform Global Variable Injection Code Description

To ensure compatibility and avoid potential global variable conflicts, this project utilizes a global variable called `platformAdapter`. This variable is responsible for adapting the `WebAPI` for different running platforms. Users need to assign `platformAdapter` to the corresponding platform's global scope in the platform's `polyfill/index.js` file.

- **Purpose of `platformAdapter`**

  The primary purpose of `platformAdapter` is to provide adaptations for `WebAPI` specific to each platform, such as `canvas`, `document`, etc. By utilizing this global variable, we ensure that code execution remains conflict-free across different engines and plugins.

- **Registering `platformAdapter` to the Global Variable**

  To register `platformAdapter` in the global scope, add the following code in your `polyfill/index.js` file, like this:

  ```javascript
  // polyfill/index.js
  import platformAdapter from 'common/global/PlatformAdapter';
  // Define the platformAdapter to the global scope
  globalThis.platformAdapter = platformAdapter;

### Engine Customization Code Description

Different platforms may require specific customizations in the engine logic. For example, the WeChat Mini Game environment lacks implementations for certain methods like `TextMetrics`'s `actualBoundingBoxLeft` and `actualBoundingBoxRight`. To address these discrepancies, you should implement the necessary custom classes and functions within the engine directory specific to that platform.

- **Writing Engine Customization Code**

  Follow these steps to write the engine customization code:

  1. **Create or Open the Specific Platform's `engine` Directory**: Within this directory, create or edit the custom classes and functions as needed.

  2. **Implement Missing Methods**: For instance, implement a custom version of `TextUtils._measureFontOrChar`. You would create the corresponding file in the `engine` directory:

      ```javascript
      // engine/TextUtils.js
      function _measureFontOrChar(fontString, measureString, isChar) {
        // ...

        // Custom implementation for WeChat Mini Game
        const { width: actualWidth } = context.measureText(measureString);

        // ...
      }
      ```

  3. **Code Replacement During Packaging**: During the packaging process, ensure that the custom code you've written is the corresponding sections in the engine's source code.

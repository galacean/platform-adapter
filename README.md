# Galacean Engine Multi-Platform Adaptation

Building the Galacean ecosystem to support adaption for mini-games, applets, and other multi-platform applications.

## Usage

- **Template Code For Platform Entry File**
  ```javascript
  // Load platform API adaptation code
  require('polyfill');

  // Load users entry file
  require('app');
  ```

- **Importing Engine Modules In User Code**
  ```javascript
  import { WebGLEngine } from "galacean-js/engine";
  import { LitePhysics } from "galacean-js/engine-physics-lite";
  import { ShaderLab } from "galacean-js/engine-shader-lab";
  ```

- **User Initializes the Engine Canvas**

  After loading the `polyfill`, a global canvas will be prepared and can be accessed through the global variable. For example, in the WeChat mini-game, you can access the engine canvas through `GameGlobal.platformAdapter.canvas`:
  ```javascript
  // Engine canvas, as an example for WeChat platform
  const canvas = GameGlobal.platformAdapter.canvas;
  WebGLEngine.create({ canvas: canvas }).then(engine => {
    engine.canvas.resizeByClientSize();
    engine.run();
  });
  ```

## Build

### CLI

- **Install Dependencies**
  ```shell
  npm install
  ```

- **Set Up Node Environment Variables**
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
    "outputDir": "./"
  }
  ```

- **Build `Polyfill` And `Engine`**
    ```shell
    npm run build
    ```

[Description of `ADAPTER_BUNDLE_SETTINGS`](#ADAPTER_BUNDLESETTINGS)

### Github Workflow

The repo has provide `action.yaml` for github workflow, which will automatically build and bundle the engine and polyfill to the enviorment.

- **Usage**
  ``` yaml
  - name: Bundle polyfill and engine
    uses: galacean/platform-adapter@tag
    env:
      ADAPTER_BUNDLE_SETTINGS: |
        {
          "polyfill": true,
          "engine": [
            "${{ github.workspace }}/node_modules/@galacean/engine/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-lottie/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-physics-lite/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-physics-physx/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-shader-lab/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-spine/dist/module.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-toolkit/dist/es/index.js",
            "${{ github.workspace }}/node_modules/@galacean/engine-xr/dist/module.js"
          ],
          "jsWASMLoader": [
            "${{ github.workspace }}/node_modules/@galacean/engine-physics-physx/libs/physx.release.js"
          ],
          "outputDir": "${{ github.workspace }}"
        }
  ```

<a id="ADAPTER_BUNDLESETTINGS"></a>
**Description Of `ADAPTER_BUNDLE_SETTINGS`**
- `polyfill`: Whether to bundle the polyfill, if using custom engine components, this option can be set to false.
- `engine`: The engine modules to bundle, specified as a list of engine module file paths, if array is empty, the engine will not be bundled.
- `jsWASMLoader`: The wasm loader for the engine, if array is empty, the jsWASMLoader will not be bundled.
- `outputDir`: The output directory for the bundled files, if not specified, the bundled files will be placed in the same directory as the action.yaml.
**Note: The engine modules and jsWASMLoader should contains `@galacean/xxx/' as name, otherwise the build will fail.**

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

After modifying the build scripts, execute `npm run build:cli` to rebuild the packaging scripts.

- **Platform Global Variable Injection Code Description**

  Currently, a global variable `platformAdapter` is added to the platform's global scope. This variable contains the `WebAPI` adaptation code for `Galacean` on the corresponding running platform, avoiding potential global variable conflicts that may arise when using multiple different engines and plugins.
  - `platformAdapter`
  Adapts WebAPI for the platform, such as `canvas`, `document`, etc.

- **Engine Customization Code Description**

  On different platforms, the engine may require different logic customizations. For instance, the WeChat mini-game environment lacks implementations for methods like `TextMetrics`'s `actualBoundingBoxLeft` and `actualBoundingBoxRight`. Therefore, these custom classes and functions need to be implemented in the `engine` directory specific to the platform, and during packaging, this code will replace the corresponding sections in the engine source.

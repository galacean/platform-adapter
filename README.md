# Galacean引擎适配多平台

Galacean生态建设，向小游戏、小程序等多平台应用适配

## 使用

- 安装环境
``` shell
npm install
```

- 打包
  - 运行Build命令，会同时打包Adapter和引擎
    ``` shell
    npm run build
    ```

  - 单独打包Adapter，可以使用以下命令
    ``` shell
    npm run build:adapter
    npm run build:engine
    ```

  - 单独打包引擎，可以使用以下命令
    ``` shell
    npm run build:engine
    ```

  - 产物结构
    - 小游戏平台
      ``` shell
      dist/
        - minigame/ # 小游戏平台
          - ${platformName}/ # 平台名，微信：wechat
            - engine.js # 引擎产物
            - platform-adapter.js # 平台定制的WebAPI
            - platform-global.js # 平台定制的全局变量
            - engine.min.js # 压缩后的引擎产物
            - platform-adapter.min.js # 压缩后的平台定制的WebAPI
            - platform-global.min.js # 压缩后的平台定制的全局变量
      ```

- 打包脚本说明
  
  `scripts`目录下提供了打包脚本，用于生成平台适配器和引擎适配器
    - build-adapter.ts: 生成平台适配器代码
    - build-engine.ts: 生成引擎适配器代码
  
  修改打包脚本后，需要执行 `npm run build:cli` 重新构建打包脚本


- 平台全局变量注入代码说明

  目前会在平台的全局变量中添加 `platformAdapter` 变量，该变量包含`Galacean`在对应运行平台的`WebAPI`适配代码，避免使用多个不同引擎、插件时，出现可能的全局变量冲突问题
  - platformAdapter
    - 适配平台的WebAPI，如 `canvas` 、 `document` 等

- 引擎定制代码说明
  - engineAdapter，在不同平台上，引擎可能需要定制不同的逻辑，如微信小游戏真机没有实现`TextMetrics`的`actualBoundingBoxLeft`、`actualBoundingBoxRight`等方法

- 使用
  - 模板
    ``` javascript
    // 加载平台 API 适配代码
    require('platform-adapter');

    // 引擎适配代码逻辑
    const core = require('engine');
    require('engine-adapter').default({
      core: core,
    });
    ```

  - 用户代码中导入引擎代码
    ``` javascript
    import { WebGLEngine, } from "engine";
    import { LitePhysics } from "engine-physics-lite";
    import { ShaderLab } from "engine-shader-lab";
    ```

  - 用户初始化引擎画布

    在`platform-adapter`代码加载后，会准备一个全局画布，可以通过全局变量获取
    - 微信小游戏通过 `GameGlobal.platformAdapter.canvas` 获取到引擎画布
      ``` javascript
      // 引擎画布，以微信平台为例
      const canvas = GameGlobal.platformAdapter.canvas;
      WebGLEngine.create({ canvas: canvas }).then(engine => {
        engine.canvas.resizeByClientSize();
        engine.run();
      });
      ```

## TODO
- [ ] PhysX 物理引擎适配

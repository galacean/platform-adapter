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

  - 单独打包引擎，可以使用以下命令，现在打包引擎时会对 `@galacean/engine`、`@galacean/engine-shader-lab`等模块分别打包，导致 `@galacean/engine`会被重复打包，需要优化逻辑
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

- 使用
  - 小游戏在用户代码加载前导入代码
    ``` javascript
    require('platform-global.min');
    require('platform-adapter.min');
    ```

  - 用户代码中导入引擎代码
    ``` javascript
    import { WebGLEngine, } from "engine.min";
    import { ShaderLab } from "engine-shader-lab.min";
    ```

  - 用户初始化引擎画布

    不同平台拥有不同的global变量，
    - 微信小游戏通过`GameGlobal.PlatformGlobal.platformAdapter.canvas` 获取到引擎画布
      ``` javascript
      // 引擎画布，以微信平台为例
      const canvas = GameGlobal.PlatformGlobal.platformAdapter.canvas;
      WebGLEngine.create({ canvas: canvas }).then(engine => {
        engine.canvas.resizeByClientSize();
        engine.run();
      });
      ```

## TODO
- [ ] 优化引擎打包逻辑，减少重复打包

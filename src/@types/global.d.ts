/// <reference path="../global/index.ts"

declare interface PlatformAdapter {
  document: Document;
  window: Window;
  performance: Performance;
}

declare interface EngineAdapter {

}

declare class PlatformGlobal {
  platformAdapter: PlatformAdapter;
  engineAdapter: EngineAdapter;
}

declare const PlatformGlobal: PlatformGlobal;

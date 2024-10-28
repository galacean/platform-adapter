import { PlatformAdapter } from "./PlatformAdapter";
import { EngineAdapter } from "./EngineAdapter";

class PlatformGlobal {
  platformAdapter: PlatformAdapter;
  engineAdapter: EngineAdapter;

  constructor() {
    this.platformAdapter = {} as PlatformAdapter;
    this.engineAdapter = {} as EngineAdapter;

    this.platformAdapter.document = {} as Document;
    this.platformAdapter.window = {} as Window;
    this.platformAdapter.performance = {} as Performance;
  }
};

GameGlobal.PlatformGlobal = new PlatformGlobal();
export default GameGlobal.PlatformGlobal;

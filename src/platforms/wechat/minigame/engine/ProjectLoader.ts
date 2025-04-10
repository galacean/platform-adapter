/// @ts-nocheck

var ProjectLoader = /*#__PURE__*/ (function (Loader) {
  _inherits(ProjectLoader, Loader);
  function ProjectLoader() {
    return Loader.apply(this, arguments) || this;
  }
  var _proto = ProjectLoader.prototype;
  _proto.load = function load(item, resourceManager) {
    var engine = resourceManager.engine;
    return new AssetPromise(function (resolve, reject) {
      resourceManager // @ts-ignore
        ._request(
          item.url,
          _extends({}, item, {
            type: "json",
          })
        )
        .then(function (data) {
          // @ts-ignore
          engine.resourceManager.initVirtualResources(data.files);
          // @ts-ignore
          engine.resourceManager.initSubpackageResources(data.subpackages);
          return resourceManager
            .load({
              type: AssetType.Scene,
              url: data.scene,
            })
            .then(function (scene) {
              engine.sceneManager.activeScene = scene;
              resolve();
            });
        })
        .catch(reject);
    });
  };
  return ProjectLoader;
})(Loader);

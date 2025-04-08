/// @ts-nocheck

/**
 * ResourceManager
 */ var ResourceManager = /*#__PURE__*/ (function () {
  function ResourceManager(engine) {
    this.engine = engine;
    this./** The number of retries after failing to load assets. */ retryCount = 1;
    this./** Retry delay time after failed to load assets, in milliseconds. */ retryInterval = 0;
    this./** The default timeout period for loading assets, in milliseconds. */ timeout =
      Infinity;
    this./** Base url for loading assets. */ baseUrl = null;
    this._loadingPromises = {};
    this._assetPool = Object.create(null);
    this._assetUrlPool = Object.create(null);
    this._referResourcePool = Object.create(null);
    this._graphicResourcePool = Object.create(null);
    this._contentRestorerPool = Object.create(null);
    this._subAssetPromiseCallbacks = {};
    this./** @internal */ _objectPool = Object.create(null);
    this./** @internal */ _idResourceMap = Object.create(null);
    this./** @internal */ _virtualPathResourceMap = Object.create(null);
    this./** @internal */ _virtualPathSubpackageMap = Object.create(null);
  }
  var _proto = ResourceManager.prototype;
  _proto.load = function load(assetInfo) {
    var _this = this;
    // single item
    if (!Array.isArray(assetInfo)) {
      return this._loadSingleItem(assetInfo);
    }
    // multi items
    var promises = assetInfo.map(function (item) {
      return _this._loadSingleItem(item);
    });
    return AssetPromise.all(promises);
  };
  /**
   * Get the resource from cache by asset url, return the resource object if it loaded, otherwise return null.
   * @param url - Resource url
   * @returns Resource object
   */ _proto.getFromCache = function getFromCache(url) {
    var _this__assetUrlPool_url;
    return (_this__assetUrlPool_url = this._assetUrlPool[url]) != null
      ? _this__assetUrlPool_url
      : null;
  };
  /**
   * Find the resource by type.
   * @param type - Resource type
   * @returns - Resource collection
   */ _proto.findResourcesByType = function findResourcesByType(type) {
    var resources = new Array();
    var referResourcePool = this._referResourcePool;
    for (var k in referResourcePool) {
      var resource = referResourcePool[k];
      if (_instanceof1$2(resource, type)) {
        resources.push(resource);
      }
    }
    return resources;
  };
  /**
   * Get asset url from instanceId.
   * @param instanceId - Engine instance id
   * @returns Asset url
   */ _proto.getAssetPath = function getAssetPath(instanceId) {
    return this._assetPool[instanceId];
  };
  _proto.cancelNotLoaded = function cancelNotLoaded(url) {
    var _this = this;
    if (!url) {
      Utils.objectValues(this._loadingPromises).forEach(function (promise) {
        promise.cancel();
      });
    } else if (typeof url === "string") {
      var _this__loadingPromises_url;
      (_this__loadingPromises_url = this._loadingPromises[url]) == null
        ? void 0
        : _this__loadingPromises_url.cancel();
    } else {
      url.forEach(function (p) {
        var _this__loadingPromises_p;
        (_this__loadingPromises_p = _this._loadingPromises[p]) == null
          ? void 0
          : _this__loadingPromises_p.cancel();
      });
    }
  };
  /**
   * Garbage collection will release resource objects managed by reference counting.
   * @remarks The release principle is that it is not referenced by the components, including direct and indirect reference.
   */ _proto.gc = function gc() {
    this._gc(false);
    this.engine._pendingGC();
  };
  /**
   * Add content restorer.
   * @param restorer - The restorer
   */ _proto.addContentRestorer = function addContentRestorer(restorer) {
    this._contentRestorerPool[restorer.resource.instanceId] = restorer;
  };
  /**
   * @internal
   */ _proto._getRemoteUrl = function _getRemoteUrl(url) {
    var _this__virtualPathResourceMap_url;
    var _this__virtualPathResourceMap_url_path;
    return (_this__virtualPathResourceMap_url_path =
      (_this__virtualPathResourceMap_url = this._virtualPathResourceMap[url]) ==
      null
        ? void 0
        : _this__virtualPathResourceMap_url.path) != null
      ? _this__virtualPathResourceMap_url_path
      : url;
  };
  /**
   * @internal
   */ _proto._requestByRemoteUrl = function _requestByRemoteUrl(url, config) {
    return request(url, config);
  };
  /**
   * @internal
   */ _proto._request = function _request(url, config) {
    var remoteUrl = this._getRemoteUrl(url);
    return this._requestByRemoteUrl(remoteUrl, config);
  };
  /**
   * @internal
   */ _proto._onSubAssetSuccess = function _onSubAssetSuccess(
    assetBaseURL,
    assetSubPath,
    value
  ) {
    var _this__virtualPathResourceMap_assetBaseURL,
      _this__subAssetPromiseCallbacks_remoteAssetBaseURL;
    var _this__virtualPathResourceMap_assetBaseURL_path;
    var remoteAssetBaseURL =
      (_this__virtualPathResourceMap_assetBaseURL_path =
        (_this__virtualPathResourceMap_assetBaseURL =
          this._virtualPathResourceMap[assetBaseURL]) == null
          ? void 0
          : _this__virtualPathResourceMap_assetBaseURL.path) != null
        ? _this__virtualPathResourceMap_assetBaseURL_path
        : assetBaseURL;
    var subPromiseCallback =
      (_this__subAssetPromiseCallbacks_remoteAssetBaseURL =
        this._subAssetPromiseCallbacks[remoteAssetBaseURL]) == null
        ? void 0
        : _this__subAssetPromiseCallbacks_remoteAssetBaseURL[assetSubPath];
    if (subPromiseCallback) {
      subPromiseCallback.resolve(value);
    } else {
      var _this__subAssetPromiseCallbacks, _remoteAssetBaseURL;
      ((_this__subAssetPromiseCallbacks = this._subAssetPromiseCallbacks)[
        (_remoteAssetBaseURL = remoteAssetBaseURL)
      ] || (_this__subAssetPromiseCallbacks[_remoteAssetBaseURL] = {}))[
        assetSubPath
      ] = {
        resolvedValue: value,
      };
    }
  };
  /**
   * @internal
   */ _proto._onSubAssetFail = function _onSubAssetFail(
    assetBaseURL,
    assetSubPath,
    value
  ) {
    var _this__subAssetPromiseCallbacks_assetBaseURL;
    var subPromiseCallback =
      (_this__subAssetPromiseCallbacks_assetBaseURL =
        this._subAssetPromiseCallbacks[assetBaseURL]) == null
        ? void 0
        : _this__subAssetPromiseCallbacks_assetBaseURL[assetSubPath];
    if (subPromiseCallback) {
      subPromiseCallback.reject(value);
    } else {
      var _this__subAssetPromiseCallbacks, _assetBaseURL;
      ((_this__subAssetPromiseCallbacks = this._subAssetPromiseCallbacks)[
        (_assetBaseURL = assetBaseURL)
      ] || (_this__subAssetPromiseCallbacks[_assetBaseURL] = {}))[
        assetSubPath
      ] = {
        rejectedValue: value,
      };
    }
  };
  /**
   * @internal
   */ _proto._addAsset = function _addAsset(path, asset) {
    this._assetPool[asset.instanceId] = path;
    this._assetUrlPool[path] = asset;
  };
  /**
   * @internal
   */ _proto._deleteAsset = function _deleteAsset(asset) {
    var id = asset.instanceId;
    var path = this._assetPool[id];
    if (path) {
      delete this._assetPool[id];
      delete this._assetUrlPool[path];
    }
  };
  /**
   * @internal
   */ _proto._addReferResource = function _addReferResource(resource) {
    this._referResourcePool[resource.instanceId] = resource;
  };
  /**
   * @internal
   */ _proto._deleteReferResource = function _deleteReferResource(resource) {
    delete this._referResourcePool[resource.instanceId];
  };
  /**
   * @internal
   */ _proto._addGraphicResource = function _addGraphicResource(resource) {
    this._graphicResourcePool[resource.instanceId] = resource;
  };
  /**
   * @internal
   */ _proto._deleteGraphicResource = function _deleteGraphicResource(
    resource
  ) {
    delete this._graphicResourcePool[resource.instanceId];
  };
  /**
   * @internal
   */ _proto._deleteContentRestorer = function _deleteContentRestorer(
    resource
  ) {
    delete this._contentRestorerPool[resource.instanceId];
  };
  /**
   * @internal
   */ _proto._restoreGraphicResources = function _restoreGraphicResources() {
    var graphicResourcePool = this._graphicResourcePool;
    for (var id in graphicResourcePool) {
      graphicResourcePool[id]._rebuild();
    }
  };
  /**
   * @internal
   */ _proto._lostGraphicResources = function _lostGraphicResources() {
    var graphicResourcePool = this._graphicResourcePool;
    for (var id in graphicResourcePool) {
      graphicResourcePool[id]._isContentLost = true;
    }
  };
  /**
   * @internal
   */ _proto._restoreResourcesContent = function _restoreResourcesContent() {
    var restoreContentInfoPool = this._contentRestorerPool;
    var restorePromises = new Array();
    for (var k in restoreContentInfoPool) {
      var restoreInfo = restoreContentInfoPool[k];
      var promise = restoreInfo.restoreContent();
      promise && restorePromises.push(promise);
    }
    return Promise.all(restorePromises);
  };
  /**
   * @internal
   */ _proto._destroy = function _destroy() {
    this.cancelNotLoaded();
    this._gc(true);
    this._assetPool = null;
    this._assetUrlPool = null;
    this._referResourcePool = null;
    this._graphicResourcePool = null;
    this._contentRestorerPool = null;
    this._loadingPromises = null;
  };
  _proto._assignDefaultOptions = function _assignDefaultOptions(assetInfo) {
    var _assetInfo_type;
    assetInfo.type =
      (_assetInfo_type = assetInfo.type) != null
        ? _assetInfo_type
        : ResourceManager._getTypeByUrl(assetInfo.url);
    if (assetInfo.type === undefined) {
      throw "asset type should be specified: " + assetInfo.url;
    }
    var _assetInfo_retryCount;
    assetInfo.retryCount =
      (_assetInfo_retryCount = assetInfo.retryCount) != null
        ? _assetInfo_retryCount
        : this.retryCount;
    var _assetInfo_timeout;
    assetInfo.timeout =
      (_assetInfo_timeout = assetInfo.timeout) != null
        ? _assetInfo_timeout
        : this.timeout;
    var _assetInfo_retryInterval;
    assetInfo.retryInterval =
      (_assetInfo_retryInterval = assetInfo.retryInterval) != null
        ? _assetInfo_retryInterval
        : this.retryInterval;
    var _assetInfo_url;
    assetInfo.url =
      (_assetInfo_url = assetInfo.url) != null
        ? _assetInfo_url
        : assetInfo.urls.join(",");
    return assetInfo;
  };
  _proto._loadSingleItem = function _loadSingleItem(itemOrURL) {
    return new AssetPromise((resolve, reject) => {
      try {
        var isString = typeof itemOrURL === "string";
        var testUrl = isString ? itemOrURL : itemOrURL.url;

        var subpackageName = null;
        Object.keys(this._virtualPathSubpackageMap).forEach((key) => {
          if (testUrl.startsWith(key) || testUrl.startsWith("/public" + key)) {
            subpackageName = this._virtualPathSubpackageMap[key];
            return;
          }
        });

        // 之前的通用逻辑
        var _this = this;
        var originLoadSingleItem = function () {
          var _this__virtualPathResourceMap_assetBaseURL;
          var item = _this._assignDefaultOptions(
            isString
              ? {
                  url: itemOrURL,
                }
              : itemOrURL
          );
          var url = item.url;
          // Not absolute and base url is set
          if (!Utils.isAbsoluteUrl(url) && _this.baseUrl)
            url = Utils.resolveAbsoluteUrl(_this.baseUrl, url);
          // Parse url
          var _this__parseURL = _this._parseURL(url),
            assetBaseURL = _this__parseURL.assetBaseURL,
            queryPath = _this__parseURL.queryPath;
          var paths = queryPath ? _this._parseQueryPath(queryPath) : [];
          var _this__virtualPathResourceMap_assetBaseURL_path;
          // Get remote asset base url
          var remoteAssetBaseURL =
            (_this__virtualPathResourceMap_assetBaseURL_path =
              (_this__virtualPathResourceMap_assetBaseURL =
                _this._virtualPathResourceMap[assetBaseURL]) == null
                ? void 0
                : _this__virtualPathResourceMap_assetBaseURL.path) != null
              ? _this__virtualPathResourceMap_assetBaseURL_path
              : assetBaseURL;
          // Check cache
          var cacheObject = _this._assetUrlPool[remoteAssetBaseURL];
          if (cacheObject) {
            resolve(_this._getResolveResource(cacheObject, paths));
            return;
          }
          // Get asset url
          var remoteAssetURL = remoteAssetBaseURL;
          if (queryPath) {
            remoteAssetURL += "?q=" + paths.shift();
            var index;
            while ((index = paths.shift())) {
              remoteAssetURL += "[" + index + "]";
            }
          }
          // Check is loading
          var loadingPromises = _this._loadingPromises;
          var loadingPromise = loadingPromises[remoteAssetURL];
          if (loadingPromise) {
            loadingPromise
              .onProgress(setTaskCompleteProgress, setTaskDetailProgress)
              .then(function (resource) {
                resolve(resource);
              })
              .catch(function (error) {
                reject(error);
              });
            return;
          }
          // Check loader
          var loader = ResourceManager._loaders[item.type];
          if (!loader) {
            reject(new Error("loader not found: " + item.type));
          }
          // Check sub asset
          if (queryPath) {
            // Check whether load main asset
            var mainPromise =
              loadingPromises[remoteAssetBaseURL] ||
              _this._loadMainAsset(
                loader,
                item,
                remoteAssetBaseURL,
                assetBaseURL
              );
            mainPromise.catch(function (e) {
              _this._onSubAssetFail(remoteAssetBaseURL, queryPath, e);
            });
            resolve(
              _this._createSubAssetPromiseCallback(
                remoteAssetBaseURL,
                remoteAssetURL,
                queryPath
              )
            );
            return;
          }
          resolve(
            _this._loadMainAsset(loader, item, remoteAssetBaseURL, assetBaseURL)
          );
        };

        if (subpackageName) {
          wx.loadSubpackage({
            name: subpackageName,
            success: () => {
              originLoadSingleItem();
            },
            fail: () => {
              reject(
                new Error("load subpackage " + subpackageName + " failed")
              );
            },
          });
        } else {
          originLoadSingleItem();
        }
      } catch (error) {
        reject(error);
      }
    });
  };
  _proto._loadMainAsset = function _loadMainAsset(
    loader,
    item,
    remoteAssetBaseURL,
    assetBaseURL
  ) {
    var _this = this;
    item.url = assetBaseURL;
    var loadingPromises = this._loadingPromises;
    var promise = loader.load(item, this);
    loadingPromises[remoteAssetBaseURL] = promise;
    promise.then(
      function (resource) {
        if (loader.useCache) {
          _this._addAsset(remoteAssetBaseURL, resource);
        }
        delete loadingPromises[remoteAssetBaseURL];
        _this._releaseSubAssetPromiseCallback(remoteAssetBaseURL);
      },
      function () {
        delete loadingPromises[remoteAssetBaseURL];
        _this._releaseSubAssetPromiseCallback(remoteAssetBaseURL);
      }
    );
    return promise;
  };
  _proto._createSubAssetPromiseCallback =
    function _createSubAssetPromiseCallback(
      remoteAssetBaseURL,
      remoteAssetURL,
      assetSubPath
    ) {
      var _this = this;
      var _this__subAssetPromiseCallbacks_remoteAssetBaseURL;
      var loadingPromises = this._loadingPromises;
      var subPromiseCallback =
        (_this__subAssetPromiseCallbacks_remoteAssetBaseURL =
          this._subAssetPromiseCallbacks[remoteAssetBaseURL]) == null
          ? void 0
          : _this__subAssetPromiseCallbacks_remoteAssetBaseURL[assetSubPath];
      var resolvedValue =
        subPromiseCallback == null ? void 0 : subPromiseCallback.resolvedValue;
      var rejectedValue =
        subPromiseCallback == null ? void 0 : subPromiseCallback.rejectedValue;
      // Already resolved or rejected
      if (resolvedValue || rejectedValue) {
        return new AssetPromise(function (resolve, reject) {
          if (resolvedValue) {
            resolve(resolvedValue);
          } else if (rejectedValue) {
            reject(rejectedValue);
          }
        });
      }
      // Pending
      var promise = new AssetPromise(function (resolve, reject) {
        var _this__subAssetPromiseCallbacks, _remoteAssetBaseURL;
        ((_this__subAssetPromiseCallbacks = _this._subAssetPromiseCallbacks)[
          (_remoteAssetBaseURL = remoteAssetBaseURL)
        ] || (_this__subAssetPromiseCallbacks[_remoteAssetBaseURL] = {}))[
          assetSubPath
        ] = {
          resolve: resolve,
          reject: reject,
        };
      });
      loadingPromises[remoteAssetURL] = promise;
      promise.then(
        function () {
          delete loadingPromises[remoteAssetURL];
        },
        function () {
          return delete loadingPromises[remoteAssetURL];
        }
      );
      return promise;
    };
  _proto._gc = function _gc(forceDestroy) {
    var objects = Utils.objectValues(this._referResourcePool);
    for (var i = 0, n = objects.length; i < n; i++) {
      var object = objects[i];
      if (!object.isGCIgnored || forceDestroy) {
        object.destroy(forceDestroy, true);
      }
    }
  };
  _proto._getResolveResource = function _getResolveResource(resource, paths) {
    var subResource = resource;
    if (paths) {
      for (var i = 0, n = paths.length; i < n; i++) {
        var path = paths[i];
        subResource = subResource[path];
      }
    }
    return subResource;
  };
  _proto._parseURL = function _parseURL(path) {
    var _path_split = path.split("?"),
      baseUrl = _path_split[0],
      searchStr = _path_split[1];
    var queryPath = undefined;
    var assetBaseURL = baseUrl;
    if (searchStr) {
      var params = searchStr.split("&");
      for (var i = params.length - 1; i >= 0; i--) {
        var param = params[i];
        if (param.startsWith("q=")) {
          queryPath = decodeURIComponent(param.split("=")[1]);
          params.splice(i, 1);
          break;
        }
      }
      assetBaseURL =
        params.length > 0 ? baseUrl + "?" + params.join("&") : baseUrl;
    }
    return {
      assetBaseURL: assetBaseURL,
      queryPath: queryPath,
    };
  };
  _proto._parseQueryPath = function _parseQueryPath(string) {
    var result = [];
    if (string.charCodeAt(0) === charCodeOfDot) {
      result.push("");
    }
    string.replace(rePropName, function (match, expression, quote, subString) {
      var key = match;
      if (quote) {
        key = subString.replace(reEscapeChar, "$1");
      } else if (expression) {
        key = expression.trim();
      }
      result.push(key);
    });
    return result;
  };
  _proto._releaseSubAssetPromiseCallback =
    function _releaseSubAssetPromiseCallback(assetBaseURL) {
      delete this._subAssetPromiseCallbacks[assetBaseURL];
    };
  /**
   * @internal
   * @beta Just for internal editor, not recommended for developers.
   */ _proto.getResourceByRef = function getResourceByRef(ref) {
    var refId = ref.refId,
      key = ref.key,
      isClone = ref.isClone;
    var obj = this._objectPool[refId];
    var promise;
    if (obj) {
      promise = Promise.resolve(obj);
    } else {
      var resourceConfig = this._idResourceMap[refId];
      if (!resourceConfig) {
        Logger.warn("refId:" + refId + " is not find in this._idResourceMap.");
        return Promise.resolve(null);
      }
      var url = resourceConfig.virtualPath;
      if (key) {
        url += "?q=" + key;
      }
      promise = this.load({
        url: url,
        type: resourceConfig.type,
      });
    }
    return promise.then(function (item) {
      return isClone ? item.clone() : item;
    });
  };
  /**
   * @internal
   * @beta Just for internal editor, not recommended for developers.
   */ _proto.initVirtualResources = function initVirtualResources(config) {
    var _this = this;
    config.forEach(function (element) {
      _this._virtualPathResourceMap[element.virtualPath] = element;
      _this._idResourceMap[element.id] = element;
      if (element.dependentAssetMap) {
        _this._virtualPathResourceMap[element.virtualPath].dependentAssetMap =
          element.dependentAssetMap;
      }
    });
  };
  /**
   * @internal
   * @beta Just for internal editor, not recommended for developers.
   */ _proto.initSubpackageResources = function initSubpackageResources(
    config
  ) {
    var _this = this;
    config && config.forEach(function (element) {
      _this._virtualPathSubpackageMap[element.root] = element.name;
    });
  };
  /**
   * @internal
   */ ResourceManager._addLoader = function _addLoader(type, loader, extNames) {
    this._loaders[type] = loader;
    for (var i = 0, len = extNames.length; i < len; i++) {
      this._extTypeMapping[extNames[i].toLowerCase()] = type;
    }
  };
  ResourceManager._getTypeByUrl = function _getTypeByUrl(url) {
    var path = url.split("?")[0];
    return this._extTypeMapping[
      path.substring(path.lastIndexOf(".") + 1).toLowerCase()
    ];
  };
  return ResourceManager;
})();

let utils = {
  cloneProperty(target, source) {
    for (let key of Object.getOwnPropertyNames(source)) {
      if (key !== 'constructor' && key !== 'prototype' && key !== 'name') {
        let desc = Object.getOwnPropertyDescriptor(source, key);
        desc && Object.defineProperty(target, key, desc);
      }
    }
  },

  cloneMethod(target, source, methodName, targetMethodName) {
    if (source[methodName]) {
      target[targetMethodName || methodName] = source[methodName].bind(source);
    }
  },
};

export default utils;

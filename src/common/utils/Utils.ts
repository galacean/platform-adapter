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

  toDictionary(o: any) {
    if (o === undefined) return {};
    if (o === Object(o)) return o;
    throw TypeError('Could not convert argument to dictionary');
  },

  isASCIIByte(a: number): boolean {
    return 0x00 <= a && a <= 0x7F;
  },

  inRange(a: number, min: number, max: number): boolean {
    return min <= a && a <= max;
  },

  indexPointerFor(codePoint: number, index: number[]): number {
    var pointer = index.indexOf(codePoint);
    return pointer === -1 ? null : pointer;
  }
};

export default utils;

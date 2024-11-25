// copy by https://github.com/WebReflection/url-search-params/blob/master/src/url-search-params.js
export class URLSearchParams {
  private dict = Object.create(null);

  constructor(query) {
    const dict = this.dict;
    let index;
    let key;
    let value;
    let pairs;
    let i;
    let length;
    if (!query) return;
    if (typeof query === "string") {
      if (query.charAt(0) === "?") {
        query = query.slice(1);
      }
      for (pairs = query.split("&"), i = 0, length = pairs.length; i < length; i++) {
        value = pairs[i];
        index = value.indexOf("=");
        if (-1 < index) {
          appendTo(dict, decode(value.slice(0, index)), decode(value.slice(index + 1)));
        } else if (value.length) {
          appendTo(dict, decode(value), "");
        }
      }
    } else {
      if (Array.isArray(query)) {
        for (i = 0, length = query.length; i < length; i++) {
          value = query[i];
          appendTo(dict, value[0], value[1]);
        }
      } else if (query.forEach) {
        query.forEach(addEach, dict);
      } else {
        for (key in query) {
          appendTo(dict, key, query[key]);
        }
      }
    }
  }

  get size() {
    return Object.keys(this.dict).length;
  }

  append(name, value) {
    appendTo(this.dict, name, value);
  }

  delete(name) {
    delete this.dict[name];
  }

  get(name) {
    const dict = this.dict;
    return name in dict ? dict[name][0] : null;
  }

  getAll(name) {
    const dict = this.dict;
    return name in dict ? dict[name].slice(0) : [];
  }

  has(name) {
    return name in this.dict;
  }

  set(name, value) {
    this.dict[name] = ["" + value];
  }

  forEach(callback, thisArg) {
    const dict = this.dict;
    Object.getOwnPropertyNames(dict).forEach(function (name) {
      dict[name].forEach(function (value) {
        callback.call(thisArg, value, name, this);
      }, this);
    }, this);
  }

  toJSON() {
    return {};
  }

  toString() {
    const dict = this.dict;
    let query = [], i, key, name, value;
    for (key in dict) {
      name = encode(key);
      for (i = 0, value = dict[key]; i < value.length; i++) {
        query.push(name + "=" + encode(value[i]));
      }
    }
    return query.join("&");
  }
}

let find = /[!'\(\)~]|%20|%00/g,
  plus = /\+/g,
  replace = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\x00"
  },
  replacer = function (match) {
    return replace[match];
  };

function addEach(value, key) {
  /* jshint validthis:true */
  appendTo(this, key, value);
}

function appendTo(dict, name, value) {
  let res = Array.isArray(value) ? value.join(",") : value;
  if (name in dict) dict[name].push(res);
  else dict[name] = [res];
}

function decode(str) {
  return decodeURIComponent(str.replace(plus, " "));
}

function encode(str) {
  return encodeURIComponent(str).replace(find, replacer);
}

import { Blob } from 'common/polyfill/Blob';

const _url = new WeakMap();
const _method = new WeakMap();
const _requestHeader = new WeakMap();
const _responseHeader = new WeakMap();
const _requestTask = new WeakMap();

function _isRelativePath(path) {
  return !/^(http|https|ftp|wxfile):\/\/.*/i.test(path);
}

export default class XMLHttpRequest {
  // TODO 没法模拟 HEADERS_RECEIVED 和 LOADING 两个状态
  static UNSEND = 0;
  static OPENED = 1;
  static HEADERS_RECEIVED = 2;
  static LOADING = 3;
  static DONE = 4;

  /*
   * TODO 这一批事件应该是在 XMLHttpRequestEventTarget.prototype 上面的
   */
  onabort = null;
  onerror = null;
  onload = null;
  onloadstart = null;
  onprogress = null;
  ontimeout = null;
  onloadend = null;

  onreadystatechange = null;
  readyState = 0;
  response = null;
  responseText = null;
  responseType = '';
  responseXML = null;
  status = 0;
  statusText = '';
  upload = {};
  withCredentials = false;

  constructor() {
    _requestHeader.set(this, {
      'content-type': 'application/x-www-form-urlencoded'
    });
    _responseHeader.set(this, {});
  }

  abort() {
    const myRequestTask =  _requestTask.get(this);

    if (myRequestTask) {
      myRequestTask.abort();
    }
  }

  getAllResponseHeaders() {
    const responseHeader = _responseHeader.get(this);

    return Object.keys(responseHeader).map((header) => {
      return `${header}: ${responseHeader[header]}`;
    }).join('\n');
  }

  getResponseHeader(header) {
    return _responseHeader.get(this)[header];
  }

  open(method, url/* async, user, password 这几个参数在小程序内不支持*/) {
    _method.set(this, method);
    _url.set(this, url);
    this._changeReadyState(XMLHttpRequest.OPENED);
  }

  overrideMimeType() {
  }

  send(data = '') {
    if (this.readyState !== XMLHttpRequest.OPENED) {
      throw new Error("Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.");
    } else {
      const url = _url.get(this);
      const responseType = this.responseType;

      const success = ({ data, statusCode, header }) => {
        if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
          try {
            data = JSON.stringify(data);
          } catch (e) {
            data = data;
          }
        }

        this.status = statusCode ?? 200;
        _responseHeader.set(this, header);
        this._triggerEvent('loadstart');
        this._changeReadyState(XMLHttpRequest.HEADERS_RECEIVED);
        this._changeReadyState(XMLHttpRequest.LOADING);

        this.response = data;

        if (data instanceof ArrayBuffer) {
          this.responseText = '';
          const bytes = new Uint8Array(data);
          const len = bytes.byteLength;

          for (let i = 0; i < len; i++) {
            this.responseText += String.fromCharCode(bytes[i]);
          }
          if (responseType === 'blob') {
            this.response = new Blob([<ArrayBuffer>this.response], { type: "image/png" });
          }
        } else {
          this.responseText = data;
        }
        this._changeReadyState(XMLHttpRequest.DONE);
        this._triggerEvent('load');
        this._triggerEvent('loadend');
      };

      const fail = ({ errMsg }) => {
        // TODO 规范错误
        if (errMsg.indexOf('abort') !== -1) {
          this._triggerEvent('abort');
        } else {
          this._triggerEvent('error', errMsg);
        }
        this._triggerEvent('loadend');
      };

      const relative = _isRelativePath(url);
      if (relative) {
        const fs = wx.getFileSystemManager();

        let options = {
          filePath: url,
          success: success,
          fail: fail
        };
        if (responseType != 'arraybuffer') {
          options["encoding"] = 'utf8';
        }
        fs.readFile(options);
        return;
      } else {
        wx.request({
          data,
          url: url,
          method: _method.get(this),
          header: _requestHeader.get(this),
          responseType: responseType === "blob" ? "arraybuffer" : responseType,
          success: success,
          fail: fail
        });
      }
    }
  }

  setRequestHeader(header, value) {
    const myHeader = _requestHeader.get(this);

    myHeader[header] = value;
    _requestHeader.set(this, myHeader);
  }

  private _triggerEvent(type, ...args) {
    if (typeof this[`on${type}`] === 'function') {
      this[`on${type}`].apply(this, args);
    }
  }

  private _changeReadyState(readyState) {
    this.readyState = readyState;
    this._triggerEvent('readystatechange');
  }

}

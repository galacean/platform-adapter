import { Blob } from 'src/common/polyfill/Blob';

type ResponseType = 'text' | 'arraybuffer';
type DataType = 'json' | string;
export default class XMLHttpRequest {
  // TODO 没法模拟 HEADERS_RECEIVED 和 LOADING 两个状态
  static UNSEND = 0;
  static OPENED = 1;
  static HEADERS_RECEIVED = 2;
  static LOADING = 3;
  static DONE = 4;

  private static readonly _url = new WeakMap();
  private static readonly _method = new WeakMap();
  private static readonly _requestHeader = new WeakMap();
  private static readonly _responseHeader = new WeakMap();
  private static readonly _requestTask = new WeakMap();

  static _isRelativePath(path) {
    return !/^(http|https|ftp|wxfile):\/\/.*/i.test(path);
  }

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
  responseType: ResponseType = 'text';
  dataType: DataType = 'string';
  responseXML = null;
  status = 0;
  statusText = '';
  upload = {};
  withCredentials = false;

  constructor() {
    XMLHttpRequest._requestHeader.set(this, {
      'content-type': 'application/x-www-form-urlencoded'
    });
    XMLHttpRequest._responseHeader.set(this, {});
  }

  abort() {
    const myRequestTask = XMLHttpRequest._requestTask.get(this);

    if (myRequestTask) {
      myRequestTask.abort();
    }
  }

  getAllResponseHeaders() {
    const responseHeader = XMLHttpRequest._responseHeader.get(this);

    return Object.keys(responseHeader).map((header) => {
      return `${header}: ${responseHeader[header]}`;
    }).join('\n');
  }

  getResponseHeader(header) {
    return XMLHttpRequest._responseHeader.get(this)[header];
  }

  open(method, url/* async, user, password 这几个参数在小程序内不支持*/) {
    XMLHttpRequest._method.set(this, method);
    XMLHttpRequest._url.set(this, url);
    this._changeReadyState(XMLHttpRequest.OPENED);
  }

  overrideMimeType() {
  }

  send(data = '') {
    if (this.readyState !== XMLHttpRequest.OPENED) {
      throw new Error("Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.");
    } else {
      const url = XMLHttpRequest._url.get(this);
      let responseType = this.responseType;
      let dataType = this.dataType;
      if (responseType as string === 'json') {
        dataType = 'json';
        responseType = 'text';
      }

      const success = ({ data, statusCode, header }) => {
        if (typeof data !== 'string' && !(data instanceof ArrayBuffer) && dataType !== 'json') {
          try {
            data = JSON.stringify(data);
          } catch (e) { }
        }

        this.status = statusCode ?? 200;
        XMLHttpRequest._responseHeader.set(this, header);
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
          if (responseType as string === 'blob') {
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

      const relative = XMLHttpRequest._isRelativePath(url);
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
          method: XMLHttpRequest._method.get(this),
          header: XMLHttpRequest._requestHeader.get(this),
          dataType: dataType,
          responseType: responseType as string === "blob" ? "arraybuffer" : responseType,
          success: success,
          fail: fail
        });
      }
    }
  }

  setRequestHeader(header, value) {
    const myHeader = XMLHttpRequest._requestHeader.get(this);

    myHeader[header] = value;
    XMLHttpRequest._requestHeader.set(this, myHeader);
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

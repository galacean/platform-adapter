class WebSocket {
  static CONNECTING: number = 0; // The connection is not yet open.
  static OPEN: number = 1; // The connection is open and ready to communicate.
  static CLOSING: number = 2; // The connection is in the process of closing.
  static CLOSED: number = 3; // The connection is closed or couldn't be opened.

  static readonly socketTask = new WeakMap();

  binaryType: string = ''; // TODO 更新 binaryType
  bufferedAmount: number = 0; // TODO 更新 bufferedAmount
  extensions: string = '';

  onclose: (object: Object) => {} = null;
  onerror: (errMsg: string | Error) => {} = null;
  onmessage: (data: string | ArrayBuffer) => {}  = null;
  onopen: (res: Object) => {} = null;

  protocol: string = ''; // TODO 小程序内目前获取不到，实际上需要根据服务器选择的 sub-protocol 返回
  readyState: number = 3;

  url: string;

  constructor(url: string, protocols = []) {
    if (typeof url !== 'string' || !(/(^ws:\/\/)|(^wss:\/\/)/).test(url)) {
      throw new TypeError(`Failed to construct 'WebSocket': The URL '${url}' is invalid`);
    }

    this.url = url;
    this.readyState = WebSocket.CONNECTING;

    const socketTask = my.connectSocket({
      multiple: true,
      url,
      protocols: Array.isArray(protocols) ? protocols : [protocols]
    });

    WebSocket.socketTask.set(this, socketTask);

    socketTask.onClose((res) => {
      this.readyState = WebSocket.CLOSED;
      if (typeof this.onclose === 'function') {
        this.onclose(res);
      }
    });

    socketTask.onMessage((res) => {
      if (typeof this.onmessage === 'function') {
        this.onmessage(res);
      }
    });

    socketTask.onOpen((res) => {
      this.readyState = WebSocket.OPEN;
      if (typeof this.onopen === 'function') {
        this.onopen(res);
      }
    });

    socketTask.onError((res) => {
      if (typeof this.onerror === 'function') {
        this.onerror(new Error(res.errMsg));
      }
    });

    return this;
  }

  close(code: number, reason: string) {
    this.readyState = WebSocket.CLOSING;
    const socketTask = WebSocket.socketTask.get(this);

    socketTask.close({
      code,
      reason
    });
  }

  send(data: string | ArrayBuffer) {
    if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
      throw new TypeError(`Failed to send message: The data ${data} is invalid`);
    }

    const socketTask = WebSocket.socketTask.get(this);

    socketTask.send({
      data
    });
  }
}

export default WebSocket;

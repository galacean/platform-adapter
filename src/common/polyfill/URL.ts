import { btoa } from "./Base64";
import { Blob } from "./Blob";

export class URL {
  /**
   * fake createObject, use base64 instead
   * @param blob
   */
  static createObjectURL(blob: Blob) {
    const buffer = blob.buffers[0];
    const type = typeof blob.type === "object" ? blob.type.type : blob.type;
    const base64 = _arrayBufferToBase64(buffer);
    const prefix = `data:${type};base64,`;
    return prefix + base64;
  }

  static revokeObjectURL(url: string) {
    // Do nothing
  }

  public href: string;
  public origin: string;
  public pathname: string;
  public protocol: string;
  public host: string;
  public hostname: string;
  public port: string;

  // todo: 完善URL对象
  constructor(url: string, base = "") {
    this.href = resolveUrl(url, base);
    // 解析协议
    let remaining = parseProtocol(this.href, base, this);
    // 解析授权部分 (hostname:port)
    remaining = parseAuthority(remaining, this);
    // 解析路径、查询参数和哈希
    parsePathQueryHash(remaining, this);
    // 计算 origin
    this.origin = `${this.protocol}//${this.hostname}${
      this.port ? `:${this.port}` : ""
    }`;
  }
}

function _arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0, len = bytes.byteLength; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 协议解析 (如 https:)
function parseProtocol(url: string, base: string, result: URL): string {
  const protocolRegex = /^([a-z0-9+.-]+:)\/\/(.*)/i;
  const match = url.match(protocolRegex);
  if (match) {
    result.protocol = match[1].toLowerCase();
    return match[2]; // 返回协议后的内容
  }

  // 处理协议相对路径 (//开头)
  if (url.startsWith("//")) {
    result.protocol = base ? new URL(base).protocol : "http:";
    return url.slice(2);
  }
  throw new Error("Invalid URL format");
}

// 授权部分解析 (hostname:port)
function parseAuthority(input: string, result: URL): string {
  const end = input.search(/[/?#]/);
  const auth = end === -1 ? input : input.slice(0, end);
  const remaining = end === -1 ? "" : input.slice(end);
  // 分离 host 和 port
  const [host, port] = auth.split(":", 2);
  result.hostname = host.toLowerCase();
  result.port = port || "";
  // 默认端口处理
  if (!port) {
    if (result.protocol === "http:") result.port = "80";
    if (result.protocol === "https:") result.port = "443";
  }
  return remaining;
}

// 路径、查询参数和哈希解析
function parsePathQueryHash(input: string, result: URL) {
  // 分离哈希部分
  const hashIndex = input.indexOf("#");
  if (hashIndex > -1) {
    input = input.slice(0, hashIndex);
  }
  // 分离查询参数
  const searchIndex = input.indexOf("?");
  if (searchIndex > -1) {
    input = input.slice(0, searchIndex);
  }
  // 处理路径
  result.pathname = normalizePath(input || "/");
}

// 路径标准化
function normalizePath(path: string): string {
  const segments = path.split("/").filter((s) => s !== ".");
  const stack: string[] = [];

  for (const seg of segments) {
    if (seg === "..") {
      stack.pop();
    } else if (seg) {
      stack.push(seg);
    }
  }

  return "/" + stack.join("/");
}

// 相对路径解析
function resolveUrl(url: string, base: string): string {
  if (!base) return url;
  // 基础协议处理
  // const baseMatch = base.match(/^([a-z0-9+.-]+:)\/\/[^/]+/i);
  const baseMatch = base.match(/^([a-z][a-z0-9+\-.]*):\/\/(.*)/i);
  if (!baseMatch) throw new Error("Invalid base URL");
  const baseProtocol = `${baseMatch[1]}:`;
  const baseHost = base.slice(baseProtocol.length + 2).split(/[/?#]/)[0];
  const basePath = base.split(/[/?#]/).slice(1).join("/") || "/";
  if (url.startsWith("/")) {
    return `${baseProtocol}//${baseHost}${url}`;
  }
  // 合并相对路径
  const pathSegments = basePath.split("/").slice(0, -1);
  const relativeSegments = url.split("/");

  for (const seg of relativeSegments) {
    if (seg === "..") {
      pathSegments.pop();
    } else if (seg !== ".") {
      pathSegments.push(seg);
    }
  }
  return `${baseProtocol}//${baseHost}/${pathSegments.join("/")}`;
}

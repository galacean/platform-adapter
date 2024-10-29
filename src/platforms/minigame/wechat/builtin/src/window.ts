import Canvas from './Canvas';

export { default as document } from './document';
export { default as navigator } from './navigator';
export { default as XMLHttpRequest } from './XMLHttpRequest';
export { default as WebSocket } from './WebSocket';
export { default as Image } from './Image';
export { default as Audio } from './Audio';
export { default as FileReader } from '../../../../../common/web/FileReader';
export { default as HTMLElement } from './HTMLElement';
export { default as localStorage } from './localStorage';
export { default as location } from './location';
export { Blob } from '../../../../../common/web/Blob';
export { URL } from '../../../../../common/web/URL';
export { URLSearchParams } from '../../../../../common/web/URLSearchParams';
export * from './WindowProperties';
export * from '../../../../../common/web/constructor';

// 暴露全局的 canvas
const canvas = Canvas();

const {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  requestAnimationFrame,
  cancelAnimationFrame,
} = GameGlobal;

export { canvas }
export { setTimeout };
export { setInterval };
export { clearTimeout };
export { clearInterval };
export { requestAnimationFrame };
export { cancelAnimationFrame };

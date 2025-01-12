const { screenWidth, screenHeight, devicePixelRatio } = my.getSystemInfoSync();

export const innerWidth = screenWidth;
export const innerHeight = screenHeight;
export { devicePixelRatio };

export { default as performance } from './Performance';

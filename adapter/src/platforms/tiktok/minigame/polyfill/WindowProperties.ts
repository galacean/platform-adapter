const { screenWidth, screenHeight, devicePixelRatio } = tt.getSystemInfoSync();

export const innerWidth = screenWidth;
export const innerHeight = screenHeight;
export { devicePixelRatio };

export { default as performance } from './Performance';

import fs from 'fs';

/**
 * @param path - Directory path of platforms
 * @returns An array contains platforms name
 */
function getPlatformsFromPath(path) {
  let platforms = fs.readdirSync(path);
  platforms = platforms.filter((p) => !p.includes('.'));
  return platforms;
}

/**
 * @param path - Path that need to be normalized, e.g. C:\Users\user\Documents\project -> C:/Users/user/Documents/project
 * @returns normalized path
 */
function normalizePath (path) {
  return path.replace(/\\/g, '/');
}

export { getPlatformsFromPath, normalizePath };

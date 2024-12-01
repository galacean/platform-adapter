import fs from 'fs';

/**
 * @param path Directory path of platforms
 * @returns An array contains platforms name
 */
function getPlatformsFromPath(path: string): string[] {
  let platforms = fs.readdirSync(path);
  platforms = platforms.filter((p) => !p.includes('.'));
  return platforms;
}

/**
 * @param path Scripts path of platforms
 * @returns An array contains scripts name
 */
function getScriptsFromPath(path: string): string[] {
  let scripts = fs.readdirSync(path);
  scripts = scripts.filter((p) => p.endsWith('.ts'));
  return scripts;
}

/**
 * @param path Path that need to be normalized, e.g. C:\Users\user\Documents\project -> C:/Users/user/Documents/project
 * @returns normalized path
 */
function normalizePath (path: string): string {
  return path.replace(/\\/g, '/');
}

export { getPlatformsFromPath, getScriptsFromPath, normalizePath };

import fs from 'fs';
import path from 'path';

/**
 * @param path Directory path of platforms
 * @returns An array contains platforms name
 */
function getPlatformsFromPath(path: string): string[] {
  if (!fs.existsSync(path)) {
    return [];
  }
  let platforms = fs.readdirSync(path);
  platforms = platforms?.filter((p) => !p.includes('.'));
  return platforms;
}

/**
 * @param path Scripts path of platforms
 * @returns An array contains scripts name
 */
function getScriptsFromPath(path: string): string[] {
  if (!fs.existsSync(path)) {
    return [];
  }
  let scripts = fs.readdirSync(path);
  scripts = scripts?.filter((p) => p.endsWith('.ts') || p.endsWith('.js'));
  return scripts;
}

/**
 * @param path Path that need to be normalized, e.g. C:\Users\user\Documents\project -> C:/Users/user/Documents/project
 * @returns normalized path
 */
function normalizePath(p: string): string {
  return path.normalize(p);
}

function getOutputDir(output?: string): string {
  let outputPath = '';
  if (output) {
    outputPath = path.join(process.cwd(), path.relative(process.cwd(), output));
  }
  if (!outputPath) {
    outputPath = process.cwd();
  }
  return normalizePath(outputPath);
}

export { getOutputDir, getPlatformsFromPath, getScriptsFromPath, normalizePath };

import fs from 'fs-extra';
import path from 'path';

function getRelativePath(base: string, to: string) {
  return path.relative(base, to);
}

function getSubDirRelativePath(base: string, to: string) {
  const relativePath = getRelativePath(base, to);
  const paths = relativePath.split(path.sep);
  paths.splice(paths.length - 1, 1);
  if (paths.length === 0) {
    return `.${path.sep}`;
  } else {
    return paths.map(() => {
      return `..${path.sep}`;
    }).join('');
  }
}

/**
 * @param path Target path
 * @returns An array contains sub directories
 */
function getSubDirectoryFromPath(path: string): string[] {
  let subDir = fs.readdirSync(path);
  subDir = subDir?.filter((p) => !p.includes('.'));
  return subDir;
}

/**
 * @param path Scripts path of platforms
 * @returns An array contains scripts name
 */
function getPackageJsonFromPath(path: string): string {
  let scripts = fs.readdirSync(path);
  scripts = scripts?.filter((p) => p === 'package.json');
  return scripts?.[0];
}

/**
 * @param path Path that need to be normalized, e.g. C:\Users\user\Documents\project -> C:/Users/user/Documents/project
 * @returns normalized path
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function getOutputDir(path?: string | undefined): string {
  return path ?? process.cwd();
}

function loadPackageJson(path: string) {
  return fs.pathExistsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : null;
}

function createResolveMatcher(id: string) {
  return new RegExp(`(^|[/\\\\])${path.basename(id, path.extname(id))}(?=([/\\\\.]|$))`);
}

export {
  getRelativePath,
  getSubDirRelativePath,
  getSubDirectoryFromPath,
  getPackageJsonFromPath,
  getOutputDir,
  normalizePath,
  loadPackageJson,
  createResolveMatcher
};

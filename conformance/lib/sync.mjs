// Publishes a finished build into the directory DevTools has open, following the design's rules for
// writing into a bound directory: only touch files this tool wrote, skip unchanged files, write the
// entry script last so DevTools never compiles a half-written game.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

function listFiles(root, dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(root, full));
    else files.push(path.relative(root, full));
  }
  return files;
}

const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/**
 * @param from finished build
 * @param to directory open in DevTools
 * @param manifestFile where the list of files written by the previous sync is kept (outside `to`)
 * @param last files written last, in this order (the run config, then the entry script)
 */
export function syncBuild(from, to, manifestFile, last = ["conformance.config.js", "game.js"]) {
  mkdirSync(to, { recursive: true });
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : [];
  const files = listFiles(from);
  const ordered = [...files.filter((f) => !last.includes(f)), ...last.filter((f) => files.includes(f))];
  let copied = 0;
  for (const file of ordered) {
    const source = path.join(from, file);
    const target = path.join(to, file);
    if (existsSync(target) && hash(source) === hash(target)) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    copied++;
  }
  const current = new Set(files);
  let removed = 0;
  for (const file of previous) {
    if (!current.has(file)) {
      rmSync(path.join(to, file), { force: true });
      removed++;
    }
  }
  writeFileSync(manifestFile, JSON.stringify(files, null, 2));
  return { copied, removed, total: files.length };
}

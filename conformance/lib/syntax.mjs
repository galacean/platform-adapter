// Finds code a platform's compiler rejects in the built scripts. Simulators run the output in a
// current browser engine and accept everything, so only this check (or a real preview) catches it.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import * as acorn from "acorn";

const LABEL = {
  "optional-catch": "ES2019 catch {}",
  "optional-chaining": "ES2020 ?.",
  nullish: "ES2020 ??",
  "logical-assignment": "ES2021 ||= &&= ??=",
  "numeric-separator": "ES2021 1_000",
  "private-name": "ES2022 #private",
  "static-block": "ES2022 static {}",
  "bigint-literal": "ES2020 0n",
  "node-require": 'require("node:…")'
};

function kindOf(node) {
  switch (node.type) {
    case "CatchClause":
      return node.param ? undefined : "optional-catch";
    case "ChainExpression":
      return "optional-chaining";
    case "LogicalExpression":
      return node.operator === "??" ? "nullish" : undefined;
    case "AssignmentExpression":
      return ["||=", "&&=", "??="].includes(node.operator) ? "logical-assignment" : undefined;
    case "Literal":
      if (node.bigint !== undefined) return "bigint-literal";
      return typeof node.value === "number" && /_/.test(node.raw ?? "") ? "numeric-separator" : undefined;
    case "PrivateIdentifier":
      return "private-name";
    case "StaticBlock":
      return "static-block";
    case "CallExpression": {
      // The compiler resolves every `require` and does not know the `node:` protocol, even in dead code.
      const [specifier] = node.arguments;
      const isRequire = node.callee.type === "Identifier" && node.callee.name === "require";
      return isRequire && specifier?.type === "Literal" && /^node:/.test(String(specifier.value)) ? "node-require" : undefined;
    }
    default:
      return undefined;
  }
}

function walk(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const key in node) {
    const value = node[key];
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value.type === "string") walk(value, visit);
  }
}

function scripts(root, dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...scripts(root, full));
    else if (entry.name.endsWith(".js")) files.push(path.relative(root, full));
  }
  return files;
}

/** @returns one line per file that uses rejected syntax, e.g. `polyfill.js: ES2020 ?. ×12 (line 1)`. */
export function findRejectedSyntax(buildDir, rejected) {
  const found = [];
  for (const file of scripts(buildDir)) {
    const code = readFileSync(path.join(buildDir, file), "utf8");
    let ast;
    try {
      ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true, locations: true });
    } catch (error) {
      found.push(`${file}: cannot be parsed (${error.message})`);
      continue;
    }
    const counts = new Map();
    walk(ast, (node) => {
      const kind = kindOf(node);
      if (!kind || !rejected.includes(kind)) return;
      const entry = counts.get(kind) ?? { count: 0, line: node.loc.start.line };
      entry.count++;
      counts.set(kind, entry);
    });
    if (counts.size) {
      found.push(`${file}: ${[...counts].map(([kind, { count, line }]) => `${LABEL[kind]} ×${count} (first at line ${line})`).join(", ")}`);
    }
  }
  return found;
}

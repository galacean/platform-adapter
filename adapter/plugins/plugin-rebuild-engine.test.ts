import { describe, it, expect } from 'vitest';
import { rollup } from 'rollup';
import fs from 'fs';
import os from 'os';
import path from 'path';
import RebuildPlugin from './plugin-rebuild-engine.js';

const engine = `
var Foo = /*#__PURE__*/ function() {
  function Foo() {}
  Foo.bar = function bar(a) { return a; };
  Foo.other = function other() { warn("engine"); };
  Foo.flag = false;
  return Foo;
}();
function warn(message) { globalThis.__warned = message; }
function _create_class$2(C, protoProps) { protoProps.forEach(function(p) { Object.defineProperty(C.prototype, p.key, p); }); }
var Bar = /*#__PURE__*/ function() {
  function Bar() { this._a = 1; this._b = 2; }
  _create_class$2(Bar, [
    { key: "a", get: function get() { return this._a; } },
    { key: "b", get: function get() { return this._b; } },
    { key: "v", get: function get() { return this._v; }, set: function set(value) { this._v = value; } }
  ]);
  return Bar;
}();
export { Foo, Bar };
`;

async function build(overrides: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebuild-engine-'));
  const entry = path.join(dir, 'node_modules/@galacean/engine/browser.js');
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.writeFileSync(entry, engine);
  const bundle = await rollup({ input: entry, plugins: RebuildPlugin.getPlugins(overrides, '@galacean/engine'), onwarn() {} });
  const { output } = await bundle.generate({ format: 'es' });
  return output[0].code;
}

describe('RebuildPlugin', () => {
  it('replaces a matching member', async () => {
    const code = await build([`var Foo = function() { Foo.bar = function bar(a) { return a + 1; }; }();`]);
    expect(code).toContain('a + 1');
  });

  it('fails when an override matches nothing in the package', async () => {
    await expect(build([`var Baz = function() { Baz.bar = function bar(a) { return a; }; }();`])).rejects.toThrow(/not found in '@galacean\/engine': Baz/);
  });

  it('fails when the overridden member is gone', async () => {
    await expect(build([`var Foo = function() { Foo.qux = function qux(a) { return a; }; }();`])).rejects.toThrow(/Foo\.qux' no longer exists/);
  });

  it('replaces only the accessors an override declares', async () => {
    const code = await build([`var Bar = function() { _create_class(Bar, [{ key: "b", get: function get() { return this._b * 10; } }]); }();`]);
    expect(code).toContain('this._b * 10');
    expect(code).toContain('return this._a;');
  });

  it('fails when an overridden accessor is gone', async () => {
    await expect(build([`var Bar = function() { _create_class(Bar, [{ key: "c", get: function get() { return 0; } }]); }();`])).rejects.toThrow(/Bar\.get\/set c' no longer exists/);
  });

  it('keeps a call at the top of an override method inside that method', async () => {
    // `warn(...)` also appears in Engine's Foo.other, and `check(...)` appears nowhere in Engine.
    const code = await build([`var Foo = function() { Foo.bar = function bar(a) { check(a); warn("override"); return a + 1; }; }();`]);
    expect(code).toMatch(/function bar\(a\) \{\s*check\(a\);\s*warn\(['"]override['"]\);\s*return a \+ 1;/);
    expect(code).toContain('warn("engine")');
  });

  it('keeps an immediately-invoked function in an override method inside that method', async () => {
    const code = await build([`var Foo = function() { Foo.bar = function bar(a) { var one = function() { warn("override"); return 1; }(); return a + one; }; }();`]);
    expect(code).toMatch(/var one = function\s*\(\) \{\s*warn\(['"]override['"]\);/);
    expect(code).toContain('warn("engine")');
  });

  it('keeps Engine\'s static initializer when an override method assigns that static', async () => {
    // Engine's AudioManager.suspend does this: copied into an override, it must not replace the class-level `false`.
    const code = await build([`var Foo = function() { Foo.bar = function bar(a) { Foo.flag = true; return a + 1; }; }();`]);
    expect(code).toContain('Foo.flag = true;');
    expect(code).toContain('Foo.flag = false;');
  });

  it('accepts an override method that assigns a static Engine does not declare', async () => {
    const code = await build([`var Foo = function() { Foo.bar = function bar(a) { Foo.cache = {}; return a + 1; }; }();`]);
    expect(code).toContain('Foo.cache = {};');
  });

  it('fails when an accessor override leaves out a setter Engine has', async () => {
    await expect(build([`var Bar = function() { _create_class(Bar, [{ key: "v", get: function get() { return 42; } }]); }();`])).rejects.toThrow(/Bar\.get\/set v' has no 'set'/);
  });

  it('replaces an accessor that declares both the getter and the setter', async () => {
    const code = await build([`var Bar = function() { _create_class(Bar, [{ key: "v", get: function get() { return 42; }, set: function set(value) { this._v = value * 2; } }]); }();`]);
    expect(code).toContain('return 42;');
    expect(code).toContain('value * 2');
  });

  it('fails when the overridden member changed its parameters', async () => {
    await expect(build([`var Foo = function() { Foo.bar = function bar(a, b) { return a; }; }();`])).rejects.toThrow(/takes 2 parameters but Engine's takes 1/);
  });
});

import { walk } from 'estree-walker';
import MagicString from 'magic-string';
import { Plugin } from 'rollup';

/**
 * Writes BigInt literals (`0n`) as `BigInt("0")` in the output.
 *
 * swc lowers syntax to the compile target but leaves BigInt literals, because BigInt cannot be compiled
 * away. A compiler that predates ES2020 rejects the literal (Douyin's preview compiler: "Identifier
 * directly after number"), while the runtime the game ships to has `BigInt`. Engine's PhysX glue has one.
 */
/**
 * Text that may be a BigInt literal: decimal (`10n`, `1_000n`), hex (`0xffn`), octal (`0o17n`) or binary
 * (`0b10n`). Only decides whether a chunk is worth parsing, so matching inside a string or comment is fine;
 * missing a literal is not (a hex literal ends in a letter: `0xffn`).
 */
const maybeBigIntLiteral = /\b(?:0[xX][\da-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*)n\b/;

export function downlevelBigInt(): Plugin {
  return {
    name: 'downlevel-bigint',
    renderChunk(code: string) {
      if (!maybeBigIntLiteral.test(code)) {
        return null;
      }
      const magicString = new MagicString(code);
      let changed = false;
      walk(this.parse(code), {
        enter(node, parent) {
          // @ts-ignore
          const bigint: string | undefined = node.type === 'Literal' ? node.bigint : undefined;
          if (bigint === undefined) {
            return;
          }
          // `{ 1n: x }` names the property "1": a call is not a valid key there.
          const isKey = parent &&
            (parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') &&
            parent.key === node && !parent.computed;
          // @ts-ignore
          magicString.overwrite(node.start, node.end, isKey ? JSON.stringify(bigint) : `BigInt("${bigint}")`);
          changed = true;
        }
      });
      return changed ? { code: magicString.toString(), map: magicString.generateMap({ hires: true }) } : null;
    }
  };
}

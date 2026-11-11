// Generates every asset the conformance cases load, so nothing third-party is checked in.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Solid-color RGBA PNG. */
export function png(width, height, [r, g, b, a = 255]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 4);
    for (let x = 0; x < width; x++) rows.set([r, g, b, a], offset + 1 + x * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/** 16-bit mono PCM WAV with a sine tone. */
export function wav(seconds = 0.25, rate = 22050, frequency = 440) {
  const samples = Math.round(seconds * rate);
  const out = Buffer.alloc(44 + samples * 2);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + samples * 2, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    out.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequency * i) / rate) * 8000), 44 + i * 2);
  }
  return out;
}

/**
 * Galacean binary Texture2D (`decode` → Texture2DDecoder), Engine 2.0 layout:
 * header [MAGIC "GLCN"][totalLength u32][version u8][typeLen u16][type][nameLen u16][name], padded to 4 bytes;
 * data [url str][mipmap][filterMode][anisoLevel][wrapU][wrapV][format][width u16][height u16][isSRGB][u32 size + image].
 */
export function galaceanTexture2D(image, width, height, name = "red") {
  const type = Buffer.from("Texture2D");
  const label = Buffer.from(name);
  const rawHeader = 4 + 4 + 1 + 2 + type.length + 2 + label.length;
  const headerLength = (rawHeader + 3) & ~3;
  const data = Buffer.alloc(2 + 6 + 4 + 1 + 4 + image.length);
  let p = 0;
  data.writeUInt16LE(0, p); // empty url string
  p += 2;
  data.set([0, 1, 1, 0, 0, 1], p); // mipmap, filterMode, anisoLevel, wrapU, wrapV, format R8G8B8A8
  p += 6;
  data.writeUInt16LE(width, p);
  data.writeUInt16LE(height, p + 2);
  p += 4;
  data.writeUInt8(1, p); // sRGB
  p += 1;
  data.writeUInt32LE(image.length, p);
  p += 4;
  image.copy(data, p);
  const out = Buffer.alloc(headerLength + data.length);
  out.writeUInt32LE(0x4e434c47, 0);
  out.writeUInt32LE(out.length, 4);
  out.writeUInt8(1, 8);
  out.writeUInt16LE(type.length, 9);
  type.copy(out, 11);
  out.writeUInt16LE(label.length, 11 + type.length);
  label.copy(out, 13 + type.length);
  data.copy(out, headerLength);
  return out;
}

/** A 4×4 world-unit quad facing +Z with an unlit red material. */
export function gltfQuad(bufferUri) {
  const positions = new Float32Array([-2, -2, 0, 2, -2, 0, 2, 2, 0, -2, 2, 0]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const bin = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);
  const uri = bufferUri ?? `data:application/octet-stream;base64,${bin.toString("base64")}`;
  const json = {
    asset: { version: "2.0" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0, mode: 4 }] }],
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1], metallicFactor: 0, roughnessFactor: 1 },
        extensions: { KHR_materials_unlit: {} }
      }
    ],
    buffers: [{ byteLength: bin.length, uri }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 48, target: 34962 },
      { buffer: 0, byteOffset: 48, byteLength: 12, target: 34963 }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-2, -2, 0], max: [2, 2, 0] },
      { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" }
    ]
  };
  return { json: JSON.stringify(json), bin };
}

/**
 * A tiny OpenType font (family "GalaceanConformance") whose "A" and "B" are solid boxes.
 * Saved as .ttf because that suffix is in the WeChat package whitelist and .otf is not.
 */
async function boxFont() {
  const { default: opentype } = await import("opentype.js");
  const box = (name, unicode) => {
    const glyphPath = new opentype.Path();
    glyphPath.moveTo(50, 0);
    glyphPath.lineTo(550, 0);
    glyphPath.lineTo(550, 700);
    glyphPath.lineTo(50, 700);
    glyphPath.close();
    return new opentype.Glyph({ name, unicode, advanceWidth: 600, path: glyphPath });
  };
  const font = new opentype.Font({
    familyName: "GalaceanConformance",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [new opentype.Glyph({ name: ".notdef", advanceWidth: 600, path: new opentype.Path() }), box("A", 65), box("B", 66)]
  });
  return Buffer.from(font.toArrayBuffer());
}

/** A font with one glyph, "中", drawn as a solid box: a subset font without any Latin character. */
async function subsetFont() {
  const { default: opentype } = await import("opentype.js");
  const glyphPath = new opentype.Path();
  glyphPath.moveTo(50, 0);
  glyphPath.lineTo(950, 0);
  glyphPath.lineTo(950, 800);
  glyphPath.lineTo(50, 800);
  glyphPath.close();
  const font = new opentype.Font({
    familyName: "GalaceanSubset",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [
      new opentype.Glyph({ name: ".notdef", advanceWidth: 1000, path: new opentype.Path() }),
      new opentype.Glyph({ name: "uni4E2D", unicode: 0x4e2d, advanceWidth: 1000, path: glyphPath })
    ]
  });
  return Buffer.from(font.toArrayBuffer());
}

async function ktx2Red() {
  const { encodeToKTX2 } = await import("ktx2-encoder");
  const width = 16;
  const height = 16;
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([255, 0, 0, 255], i * 4);
  const out = await encodeToKTX2(new Uint8Array(0), {
    isUASTC: false,
    generateMipmap: false,
    isKTX2File: true,
    imageDecoder: async () => ({ data, width, height })
  });
  return Buffer.from(out);
}

/**
 * Writes the assets into `<project>/public/conformance` (main package) and `<project>/public/conf-sub`
 * (a subpackage), and returns the directory served over HTTP plus values the game needs.
 */
export async function writeAssets(projectDir) {
  const main = path.join(projectDir, "public/conformance");
  const sub = path.join(projectDir, "public/conf-sub");
  mkdirSync(main, { recursive: true });
  mkdirSync(sub, { recursive: true });

  const red = png(4, 4, [255, 0, 0]);
  const quad = gltfQuad("quad.bin");
  const embedded = gltfQuad();
  const files = {
    "red.png": red,
    "data.bin": Buffer.from(Array.from({ length: 256 }, (_, i) => i)),
    "text.txt": Buffer.from("Galacean 小游戏", "utf8"),
    "data.json": Buffer.from(JSON.stringify({ name: "galacean", n: 42 })),
    "tone.wav": wav(),
    // Suffixes outside the WeChat package whitelist get ".bin", as the Editor export does.
    "red.tex.bin": galaceanTexture2D(red, 4, 4),
    "red.ktx2.bin": await ktx2Red(),
    "quad.gltf": Buffer.from(quad.json),
    "quad.bin": quad.bin,
    "quad-embedded.gltf": Buffer.from(embedded.json),
    "box.ttf": await boxFont(),
    "subset.ttf": await subsetFont(),
    // Engine's FontLoader reads a JSON description that points at the font file.
    "box-font.json": Buffer.from(JSON.stringify({ fontName: "ConformanceBox", fontUrl: "box.ttf" }))
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(main, name), content);

  writeFileSync(path.join(sub, "red.png"), red);
  // One file per subpackage case, so no case finds another's texture in Engine's cache.
  writeFileSync(path.join(sub, "green.png"), png(4, 4, [0, 255, 0]));
  writeFileSync(path.join(sub, "blue.png"), png(4, 4, [0, 0, 255]));
  // Each subpackage entry records that it ran, so a case can tell whether DevTools compiled it.
  // `public/conf-sub` mirrors the Editor export layout; `conf-sub-top` sits at the project root.
  const marker = (name) =>
    `GameGlobal.__conformanceSubpackages = (GameGlobal.__conformanceSubpackages || []).concat(${JSON.stringify(name)});\n`;
  writeFileSync(path.join(sub, "game.js"), marker("conf-sub"));
  const top = path.join(projectDir, "conf-sub-top");
  mkdirSync(top, { recursive: true });
  writeFileSync(path.join(top, "game.js"), marker("conf-sub-top"));

  return { servedDir: main, redPngBase64: red.toString("base64") };
}

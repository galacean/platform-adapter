import {
  AssetType,
  Color,
  Engine,
  Entity,
  Material,
  MeshRenderer,
  PrimitiveMesh,
  Texture2D,
  UnlitMaterial
} from "@galacean/engine";
import { assert, Context, Region } from "../harness";

export type RGB = [number, number, number];

export const RED: RGB = [255, 0, 0];
export const GREEN: RGB = [0, 255, 0];
export const BLUE: RGB = [0, 0, 255];
export const BLACK: RGB = [0, 0, 0];

/** A small square at the canvas center (or offset from it, in pixels). */
export function centerRegion(engine: Engine, size = 4, dx = 0, dy = 0): Region {
  const { width, height } = engine.canvas;
  return { x: Math.floor(width / 2 - size / 2 + dx), y: Math.floor(height / 2 - size / 2 + dy), width: size, height: size };
}

export function averageColor(pixels: Uint8Array): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

export function expectColor(pixels: Uint8Array, expected: RGB, tolerance: number, label: string): void {
  const actual = averageColor(pixels);
  const ok = actual.every((value, i) => Math.abs(value - expected[i]) <= tolerance);
  assert(ok, `${label}: expected rgb(${expected.join(",")}) ±${tolerance}, got rgb(${actual.join(",")})`);
}

/** A camera-facing square (4×4 world units) that covers the canvas center. */
export function quad(ctx: Context, material: Material, name = "quad"): Entity {
  const entity = ctx.root.createChild(name);
  const renderer = entity.addComponent(MeshRenderer);
  renderer.mesh = PrimitiveMesh.createCuboid(ctx.engine, 4, 4, 0.1);
  renderer.setMaterial(material);
  return entity;
}

export function unlit(engine: Engine, color?: RGB, texture?: Texture2D): UnlitMaterial {
  const material = new UnlitMaterial(engine);
  if (color) material.baseColor = new Color(color[0] / 255, color[1] / 255, color[2] / 255, 1);
  if (texture) material.baseTexture = texture;
  return material;
}

export function load<T>(engine: Engine, url: string, type: string, params?: Record<string, unknown>): Promise<T> {
  return engine.resourceManager.load<T>({ url, type, params } as any) as unknown as Promise<T>;
}

/** Renders a texture on the center quad and checks the sampled color. */
export async function expectTextureColor(ctx: Context, texture: Texture2D, expected: RGB, tolerance: number, label: string) {
  quad(ctx, unlit(ctx.engine, [255, 255, 255], texture));
  const [pixels] = await ctx.capture([centerRegion(ctx.engine)]);
  expectColor(pixels, expected, tolerance, label);
}

export function callback<T>(start: (resolve: (value: T) => void, reject: (error: unknown) => void) => void, label: string) {
  return new Promise<T>((resolve, reject) => {
    try {
      start(resolve, (error) => reject(error instanceof Error ? error : new Error(`${label}: ${JSON.stringify(error)}`)));
    } catch (error) {
      reject(error);
    }
  });
}

export { AssetType };

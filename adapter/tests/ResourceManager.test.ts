import { describe, expect, it } from 'vitest';
import { AssetPromise, Loader, ResourceManager, TextAsset, resourceLoader } from '@galacean/engine-core';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

type PackageRequest = { success(): void; fail(error: { errMsg: string }): void };

function setup(platform: string, synchronous = false) {
  const packages: PackageRequest[] = [];
  const loads: Array<{
    promise: AssetPromise<TextAsset>;
    resolve(asset: TextAsset): void;
    progress(loaded: number, total: number): void;
    canceled: number;
  }> = [];
  const api = {
    loadSubpackage(request: PackageRequest) {
      packages.push(request);
      if (synchronous) request.success();
    }
  };
  class AdaptedResourceManager extends ResourceManager {}
  vm.runInNewContext(
    fs.readFileSync(path.resolve(`adapter/src/platforms/${platform}/minigame/engine/ResourceManager.ts`), 'utf8'),
    { _proto: AdaptedResourceManager.prototype, AssetPromise, wx: api, tt: api }
  );
  class ControlledLoader extends Loader<TextAsset> {
    load() {
      const task = { canceled: 0 } as typeof loads[number];
      task.promise = new AssetPromise<TextAsset>((resolve, reject, progress, detail, onCancel) => {
        task.resolve = resolve;
        task.progress = progress;
        onCancel(() => task.canceled++);
      });
      loads.push(task);
      return task.promise;
    }
  }
  resourceLoader('adapter-test', ['adapter-test'])(ControlledLoader);
  const manager = new AdaptedResourceManager({} as any);
  const url = 'sub/resource.adapter-test';
  manager.registerVirtualResources([
    { virtualPath: url, path: 'public/sub/resource.adapter-test', type: 'adapter-test', subpackageName: 'sub' }
  ]);
  const asset = () => new TextAsset(manager.engine);
  return { manager, packages, loads, url, asset };
}

describe.each(['wechat', 'tiktok'])('%s subpackage loading', (platform) => {
  for (const synchronous of [false, true]) {
    for (const cancellation of ['direct', 'manager']) {
      it.each(['then', 'catch'])(`retries from %s after ${synchronous ? 'synchronous' : 'asynchronous'} handoff and ${cancellation} cancellation`, async (handler) => {
        const { manager, packages, loads, url, asset } = setup(platform, synchronous);
        const first = manager.load<TextAsset>(url);
        if (!synchronous) packages[0].success();
        let reload: AssetPromise<TextAsset>;
        let reason: unknown;
        const retryStarted = new Promise<void>((resolve) => {
          const retry = (error: unknown) => {
            reason = error;
            reload = manager.load<TextAsset>(url);
            reload.catch(() => undefined);
            resolve();
          };
          if (handler === 'catch') first.catch(retry);
          else first.then(undefined, retry);
        });
        if (cancellation === 'direct') {
          expect(first.cancel()).toBe(first);
          expect(first.cancel()).toBeUndefined();
        } else {
          manager.cancelNotLoaded(url);
        }
        await retryStarted;
        expect(reason).toBe('canceled');
        expect(packages).toHaveLength(2);
        if (!synchronous) packages[1].success();
        const next = manager.load<TextAsset>(url);
        expect(loads).toHaveLength(2);
        expect(loads[0].canceled).toBe(1);
        const stale = asset();
        loads[0].resolve(stale);
        const fresh = asset();
        loads[1].resolve(fresh);
        const resources = await Promise.all([reload, next]);
        expect(resources).toEqual([fresh, fresh]);
        expect(resources[0]).toBe(resources[1]);
        expect(manager.getFromCache(url)).toBe(fresh);
        expect(first.cancel()).toBeUndefined();
        expect(reload.cancel()).toBeUndefined();
        expect(loads[1].canceled).toBe(0);
      });
    }
  }

  it.each(['direct', 'manager'])('retries after %s cancellation while the subpackage is pending', async (cancellation) => {
    const { manager, packages, loads, url, asset } = setup(platform);
    const first = manager.load<TextAsset>(url);
    let reload: AssetPromise<TextAsset>;
    const retryStarted = new Promise<void>((resolve) => {
      first.catch(() => {
        reload = manager.load<TextAsset>(url);
        resolve();
      });
    });
    if (cancellation === 'direct') first.cancel();
    else manager.cancelNotLoaded(url);
    await retryStarted;
    expect(packages).toHaveLength(2);
    packages[0].success();
    expect(loads).toHaveLength(0);
    packages[1].success();
    const fresh = asset();
    loads[0].resolve(fresh);
    expect(await reload).toBe(fresh);
    expect(loads).toHaveLength(1);
  });

  it('forwards progress and preserves successful loads', async () => {
    const { manager, packages, loads, url, asset } = setup(platform);
    const progress: number[][] = [];
    const pending = manager.load<TextAsset>(url).onProgress((loaded, total) => progress.push([loaded, total]));
    packages[0].success();
    loads[0].progress(1, 2);
    const fresh = asset();
    loads[0].resolve(fresh);
    expect(await pending).toBe(fresh);
    expect(progress).toEqual([[1, 2]]);
    expect(pending.cancel()).toBeUndefined();
    expect(loads[0].canceled).toBe(0);
    expect(await manager.load(url)).toBe(fresh);
    expect(packages).toHaveLength(1);
  });
});

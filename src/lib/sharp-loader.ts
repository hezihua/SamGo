import type sharp from "sharp";

type SharpFn = typeof sharp;

let sharpModule: Promise<SharpFn> | null = null;

/** 延迟加载 sharp，避免部分部署环境在路由模块初始化阶段直接 500 */
export async function loadSharp(): Promise<SharpFn> {
  if (!sharpModule) {
    sharpModule = import("sharp").then((m) => m.default);
  }
  return sharpModule;
}

export async function tryLoadSharp(): Promise<SharpFn | null> {
  try {
    return await loadSharp();
  } catch (err) {
    sharpModule = null;
    console.warn(
      "[sharp]",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
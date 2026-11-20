import type sharp from "sharp";

type SharpFn = typeof sharp;

let sharpModule: Promise<SharpFn> | null = null;

/** 延迟加载 sharp，避免部分部署环境在路由模块初始化阶段直接 500 */
export async function loadSharp(): Promise<SharpFn> {
  if (!sharpModule) {
    sharpModule = import("sharp")
      .then((m) => m.default)
      .catch((err: unknown) => {
        sharpModule = null;
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(
          `图片处理模块加载失败（${detail}）。若在生产环境，请确认部署包含 sharp 的 linux 依赖后重新 deploy。`,
        );
      });
  }
  return sharpModule;
}
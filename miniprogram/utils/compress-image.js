/** 上传前压缩：最大宽度约 1200px，质量 0.8，降低 OSS 5MB 失败概率 */
const MAX_UPLOAD_WIDTH = 1200;
const UPLOAD_QUALITY = 80;

function compressOnce(src, options) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      ...options,
      success(res) {
        const out = res.tempFilePath || src;
        resolve(out);
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

function compressImageForUpload(src) {
  if (!src) {
    return Promise.reject(new Error("无效图片"));
  }
  if (typeof wx.compressImage !== "function") {
    return Promise.resolve(src);
  }

  return compressOnce(src, {
    quality: UPLOAD_QUALITY,
    compressedWidth: MAX_UPLOAD_WIDTH,
  })
    .catch(() =>
      compressOnce(src, { quality: UPLOAD_QUALITY }).catch(() => src),
    );
}

module.exports = {
  compressImageForUpload,
  MAX_UPLOAD_WIDTH,
  UPLOAD_QUALITY,
};

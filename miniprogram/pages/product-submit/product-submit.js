const { ensureValidSession, clearSession } = require("../../utils/auth");
const { requestWithAuth, uploadWithAuth } = require("../../utils/api");
const { getApiBase } = require("../../utils/get-api-base");
const { compressImageForUpload } = require("../../utils/compress-image");

const CLIENT_BUILD = "1.0.8-compress";

Page({
  data: {
    imageUrl: "",
    pendingList: [],
    rejectedList: [],
    resubmitId: "",
    submitting: false,
    pickStatus: "",
  },

  setPickStatus(msg) {
    this.setData({ pickStatus: msg });
  },

  async onShow() {
    try {
      await ensureValidSession();
      this.loadSubmissions();
    } catch (_e) {
      clearSession();
      wx.redirectTo({ url: "/pages/home/home" });
    }
  },

  async loadSubmissions() {
    try {
      const data = await requestWithAuth("/api/products/my-submissions", "GET");
      const rows = data.submissions || [];
      const pendingList = rows.filter((r) => r.review_status === "pending");
      const rejectedList = rows.filter((r) => r.review_status === "rejected");
      this.setData({ pendingList, rejectedList });
    } catch (_e) {
      this.setData({ pendingList: [], rejectedList: [] });
    }
  },

  uploadTempImage(temp) {
    this.setData({ imageUrl: temp });
    wx.showLoading({ title: "压缩中", mask: true });
    this.setPickStatus("压缩图片…");
    return compressImageForUpload(temp)
      .then((filePath) => {
        wx.showLoading({ title: "上传中", mask: true });
        this.setPickStatus("上传中…");
        const extMatch = /\.(\w+)(?:\?|$)/i.exec(filePath);
        const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        return uploadWithAuth("/api/products/upload-image", filePath, {
          filename: `poster.${ext}`,
          kind: "poster",
        });
      })
      .then((data) => {
        const url = data && data.url ? String(data.url).trim() : "";
        if (!url) {
          throw new Error("服务未返回图片地址");
        }
        this.setData({ imageUrl: url });
        this.setPickStatus("");
        wx.showToast({ title: "海报已上传", icon: "success" });
      })
      .catch((err) => {
        this.setData({ imageUrl: "" });
        this.setPickStatus((err && err.message) || "上传失败");
        wx.showToast({
          title: (err && err.message) || "上传失败",
          icon: "none",
          duration: 3000,
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  pickFromAlbum() {
    wx.hideLoading();
    this.setPickStatus(`${CLIENT_BUILD} · 打开相册…`);
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album"],
      success: (res) => {
        const temp = res.tempFilePaths && res.tempFilePaths[0];
        if (!temp) {
          this.setPickStatus("未选到图片");
          wx.showToast({ title: "未选到图片", icon: "none" });
          return;
        }
        this.setPickStatus("已选图，准备压缩…");
        this.uploadTempImage(temp);
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || "无法打开相册";
        if (/cancel/i.test(msg)) {
          this.setPickStatus("");
          return;
        }
        this.setPickStatus(msg);
        wx.showToast({ title: msg, icon: "none", duration: 3000 });
      },
    });
  },

  ensurePrivacyThenPick() {
    const run = () => this.pickFromAlbum();
    if (typeof wx.getPrivacySetting !== "function") {
      run();
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          run();
          return;
        }
        if (typeof wx.requirePrivacyAuthorize !== "function") {
          this.setPickStatus("请先同意隐私协议（设置-隐私）");
          wx.showToast({
            title: "需同意隐私协议后才可选图",
            icon: "none",
            duration: 3000,
          });
          wx.hideLoading();
          return;
        }
        let done = false;
        const finish = (fn) => {
          if (done) return;
          done = true;
          fn();
        };
        const timer = setTimeout(() => {
          finish(() => {
            this.setPickStatus("隐私授权超时，尝试直接选图…");
            run();
          });
        }, 4000);
        wx.requirePrivacyAuthorize({
          success: () => {
            clearTimeout(timer);
            finish(run);
          },
          fail: () => {
            clearTimeout(timer);
            finish(() => {
              wx.hideLoading();
              this.setPickStatus("未同意隐私协议");
              wx.showToast({
                title: "需同意隐私协议后才可选图",
                icon: "none",
                duration: 3000,
              });
            });
          },
        });
      },
      fail: () => run(),
    });
  },

  onChooseImage() {
    let env = "";
    try {
      env = wx.getAccountInfoSync().miniProgram.envVersion || "";
    } catch (_e) {}
    getApiBase();
    this.setPickStatus(`${CLIENT_BUILD} · ${env || "?"} · 点击已响应`);
    wx.showLoading({ title: "请稍候", mask: true });
    this.ensurePrivacyThenPick();
  },

  onEditRejected(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.rejectedList || []).find((r) => r.id === id);
    if (!item) return;
    this.setData({
      resubmitId: item.id,
      imageUrl: item.image_url || "",
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
    wx.showToast({ title: "请更换海报后提交", icon: "none" });
  },

  onCancelResubmit() {
    this.setData({
      resubmitId: "",
      imageUrl: "",
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const img = (this.data.imageUrl || "").trim();
    if (!img) {
      wx.showToast({ title: "请上传山姆分享海报", icon: "none" });
      return;
    }
    if (!/^https:\/\//i.test(img)) {
      wx.showToast({ title: "图片未上传完成，请重选", icon: "none" });
      return;
    }

    const payload = { image_url: img };
    const resubmitId = (this.data.resubmitId || "").trim();
    this.setData({ submitting: true });
    try {
      let message = "已提交审核";
      if (resubmitId) {
        const data = await requestWithAuth(
          `/api/products/submissions/${resubmitId}`,
          "PATCH",
          payload,
        );
        message = (data && data.message) || "已重新提交";
        wx.showToast({ title: "已重新提交", icon: "success" });
      } else {
        const data = await requestWithAuth("/api/products/submit", "POST", payload);
        message = (data && data.message) || message;
        wx.showToast({ title: message, icon: "success", duration: 2500 });
      }
      this.setData({
        imageUrl: "",
        resubmitId: "",
      });
      this.loadSubmissions();
    } catch (err) {
      wx.showToast({ title: err.message || "提交失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

const { ensureValidSession, clearSession } = require("../../utils/auth");
const { requestWithAuth, uploadWithAuth } = require("../../utils/api");

Page({
  data: {
    name: "",
    price: "",
    unit: "\u4ef6",
    category: "\u5176\u4ed6",
    description: "",
    imageUrl: "",
    pendingList: [],
    rejectedList: [],
    resubmitId: "",
    submitting: false,
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

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },
  onPriceInput(e) {
    this.setData({ price: e.detail.value });
  },
  onUnitInput(e) {
    this.setData({ unit: e.detail.value });
  },
  onCategoryInput(e) {
    this.setData({ category: e.detail.value });
  },
  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  uploadTempImage(temp) {
    this.setData({ imageUrl: temp });
    wx.showLoading({ title: "\u4e0a\u4f20\u4e2d", mask: true });
    const extMatch = /\.(\w+)(?:\?|$)/i.exec(temp);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    return uploadWithAuth("/api/products/upload-image", temp, {
      filename: `photo.${ext}`,
    })
      .then((data) => {
        const url = data && data.url ? String(data.url).trim() : "";
        if (!url) {
          throw new Error("\u670d\u52a1\u672a\u8fd4\u56de\u56fe\u7247\u5730\u5740");
        }
        this.setData({ imageUrl: url });
        wx.showToast({ title: "\u56fe\u7247\u5df2\u4e0a\u4f20", icon: "success" });
      })
      .catch((err) => {
        this.setData({ imageUrl: "" });
        wx.showToast({
          title: (err && err.message) || "\u4e0a\u4f20\u5931\u8d25",
          icon: "none",
          duration: 3000,
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  openChooseMedia() {
    wx.hideLoading();
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      fail: (err) => {
        const msg = (err && err.errMsg) || "";
        if (/cancel/i.test(msg)) {
          return;
        }
        if (typeof wx.chooseImage === "function") {
          wx.chooseImage({
            count: 1,
            sizeType: ["compressed"],
            success: (res) => {
              const temp = res.tempFilePaths && res.tempFilePaths[0];
              if (temp) {
                this.uploadTempImage(temp);
              } else {
                wx.showToast({ title: "未选到图片", icon: "none" });
              }
            },
            fail: (e2) => {
              wx.showToast({
                title: (e2 && e2.errMsg) || msg || "无法打开相册",
                icon: "none",
                duration: 3000,
              });
            },
          });
          return;
        }
        wx.showToast({
          title: msg || "无法打开相册",
          icon: "none",
          duration: 3000,
        });
      },
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          wx.showToast({ title: "未选到图片", icon: "none" });
          return;
        }
        this.uploadTempImage(file.tempFilePath);
      },
    });
  },

  onChooseImage() {
    wx.showLoading({ title: "\u8bf7\u7a0d\u5019", mask: true });
    const run = () => this.openChooseMedia();
    if (typeof wx.requirePrivacyAuthorize === "function") {
      wx.requirePrivacyAuthorize({
        success: run,
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: "\u9700\u540c\u610f\u9690\u79c1\u534f\u8bae\u624d\u53ef\u9009\u56fe",
            icon: "none",
            duration: 3000,
          });
        },
      });
      return;
    }
    run();
  },

  onEditRejected(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.rejectedList || []).find((r) => r.id === id);
    if (!item) return;
    this.setData({
      resubmitId: item.id,
      name: item.name || "",
      price: item.price != null ? String(item.price) : "",
      unit: item.unit || "\u4ef6",
      category: item.category || "\u5176\u4ed6",
      description: item.description || "",
      imageUrl: item.image_url || "",
    });
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
    wx.showToast({ title: "\u5df2\u586b\u5165\u8868\u5355\uff0c\u4fee\u6539\u540e\u70b9\u63d0\u4ea4", icon: "none" });
  },

  onCancelResubmit() {
    this.setData({
      resubmitId: "",
      name: "",
      price: "",
      unit: "\u4ef6",
      category: "\u5176\u4ed6",
      description: "",
      imageUrl: "",
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    const name = (this.data.name || "").trim();
    const price = Number.parseFloat(this.data.price);
    if (!name) {
      wx.showToast({ title: "\u8bf7\u586b\u5199\u540d\u79f0", icon: "none" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      wx.showToast({ title: "\u8bf7\u586b\u5199\u6709\u6548\u4ef7\u683c", icon: "none" });
      return;
    }
    if (!(this.data.imageUrl || "").trim()) {
      wx.showToast({ title: "\u8bf7\u4e0a\u4f20\u5546\u54c1\u56fe\u7247", icon: "none" });
      return;
    }

    const payload = {
      name,
      price,
      unit: (this.data.unit || "\u4ef6").trim() || "\u4ef6",
      category: (this.data.category || "\u5176\u4ed6").trim() || "\u5176\u4ed6",
      description: (this.data.description || "").trim() || undefined,
      image_url: this.data.imageUrl.trim(),
    };

    const resubmitId = (this.data.resubmitId || "").trim();
    this.setData({ submitting: true });
    try {
      if (resubmitId) {
        await requestWithAuth(
          `/api/products/submissions/${resubmitId}`,
          "PATCH",
          payload,
        );
        wx.showToast({ title: "\u5df2\u91cd\u65b0\u63d0\u4ea4", icon: "success" });
      } else {
        await requestWithAuth("/api/products/submit", "POST", payload);
        wx.showToast({ title: "\u5df2\u63d0\u4ea4\u5ba1\u6838", icon: "success" });
      }
      this.setData({
        name: "",
        price: "",
        description: "",
        imageUrl: "",
        resubmitId: "",
      });
      this.loadSubmissions();
    } catch (err) {
      wx.showToast({ title: err.message || "\u63d0\u4ea4\u5931\u8d25", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

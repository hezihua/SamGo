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
    pending: [],
    submitting: false,
  },

  async onShow() {
    try {
      await ensureValidSession();
      this.loadPending();
    } catch (_e) {
      clearSession();
      wx.redirectTo({ url: "/pages/home/home" });
    }
  },

  async loadPending() {
    try {
      const data = await requestWithAuth("/api/products/my-submissions", "GET");
      this.setData({ pending: data.submissions || [] });
    } catch (_e) {
      this.setData({ pending: [] });
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

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        wx.showLoading({ title: "\u4e0a\u4f20\u4e2d" });
        try {
          const data = await uploadWithAuth(
            "/api/products/upload-image",
            file.tempFilePath,
          );
          this.setData({ imageUrl: data.url || "" });
        } catch (err) {
          wx.showToast({ title: err.message || "\u4e0a\u4f20\u5931\u8d25", icon: "none" });
        } finally {
          wx.hideLoading();
        }
      },
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

    this.setData({ submitting: true });
    try {
      await requestWithAuth("/api/products/submit", "POST", {
        name,
        price,
        unit: (this.data.unit || "\u4ef6").trim() || "\u4ef6",
        category: (this.data.category || "\u5176\u4ed6").trim() || "\u5176\u4ed6",
        description: (this.data.description || "").trim() || undefined,
        image_url: this.data.imageUrl || undefined,
      });
      wx.showToast({ title: "\u5df2\u63d0\u4ea4\u5ba1\u6838", icon: "success" });
      this.setData({ name: "", price: "", description: "", imageUrl: "" });
      this.loadPending();
    } catch (err) {
      wx.showToast({ title: err.message || "\u63d0\u4ea4\u5931\u8d25", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

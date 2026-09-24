const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");
const { rest } = require("../../utils/supabase");

const STATUS_LABEL = {
  open: "\u8fdb\u884c\u4e2d",
  closing: "\u5373\u5c06\u622a\u6b62",
  closed: "\u5df2\u622a\u6b62",
  completed: "\u5df2\u5b8c\u6210",
};

Page({
  data: {
    orderId: "",
    order: null,
    products: [],
    myItems: [],
    statusLabel: "",
    canAdd: false,
    loading: true,
    error: "",
  },

  onLoad(options) {
    const session = getSession();
    if (!session?.access_token) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    const orderId = options?.id;
    if (!orderId) {
      this.setData({ loading: false, error: "\u62fc\u5355\u4e0d\u5b58\u5728" });
      return;
    }
    this._userId = session.user?.id;
    this.setData({ orderId });
    this.loadAll();
  },

  async loadAll() {
    const { orderId } = this.data;
    const userId = this._userId;
    this.setData({ loading: true, error: "" });
    try {
      const orders = await rest(
        `group_orders?id=eq.${orderId}&select=id,title,status,deadline,delivery_address,min_participants`
      );
      const order = Array.isArray(orders) ? orders[0] : null;
      if (!order) {
        throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
      }
      const canAdd = order.status === "open" || order.status === "closing";
      let products = [];
      const links = await rest(
        `group_order_products?group_order_id=eq.${orderId}&select=sort_order,products(id,name,price,image_url,category,unit)&order=sort_order.asc`,
      );
      if (Array.isArray(links) && links.length > 0) {
        products = links.map((row) => row.products).filter(Boolean);
      } else {
        products = await rest("products?select=*&order=name.asc");
      }
      const myItems = userId
        ? await rest(
            `order_items?group_order_id=eq.${orderId}&user_id=eq.${userId}&select=id,product_name,product_price,quantity&order=created_at.desc`
          )
        : [];
      this.setData({
        order,
        products: products || [],
        myItems: myItems || [],
        statusLabel: STATUS_LABEL[order.status] || order.status,
        canAdd,
        loading: false,
      });
    } catch (err) {
      this.setData({
        error: err.message || "\u52a0\u8f7d\u5931\u8d25",
        loading: false,
      });
    }
  },

  onAddProduct(e) {
    const productId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    if (!productId || !this.data.canAdd) return;

    wx.showModal({
      title: name,
      editable: true,
      placeholderText: "\u6570\u91cf",
      success: async (res) => {
        if (!res.confirm) return;
        const quantity = parseInt(res.content, 10);
        if (!quantity || quantity < 1) {
          wx.showToast({ title: "\u8bf7\u8f93\u5165\u6709\u6548\u6570\u91cf", icon: "none" });
          return;
        }
        try {
          await requestWithAuth("/api/order-items", "POST", {
            group_order_id: this.data.orderId,
            product_id: productId,
            quantity,
          });
          wx.showToast({ title: "\u5df2\u6dfb\u52a0", icon: "success" });
          this.loadAll();
        } catch (err) {
          wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
        }
      },
    });
  },

  onShareAppMessage() {
    const { orderId, order } = this.data;
    return {
      title: order?.title ? `\u62fc\u5355\uff1a${order.title}` : "SamGo \u62fc\u5355",
      path: `/pages/order/detail?id=${orderId}`,
    };
  },
});

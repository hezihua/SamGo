const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");
const { rest } = require("../../utils/supabase");

const STATUS_LABEL = {
  open: "\u8fdb\u884c\u4e2d",
  closing: "\u5373\u5c06\u622a\u6b62",
  closed: "\u5df2\u622a\u6b62",
  completed: "\u5df2\u5b8c\u6210",
};

function formatDeadlineShort(iso) {
  if (!iso) return "";
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
  }
  return s.length > 16 ? s.slice(0, 16) : s;
}

function buildTeamGroups(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const nick =
      (row.profiles && row.profiles.nickname && row.profiles.nickname.trim()) ||
      "\u62fc\u53cb";
    if (!map.has(row.user_id)) {
      map.set(row.user_id, {
        nickname: nick,
        avatarLetter: nick.charAt(0) || "\u62fc",
        items: [],
      });
    }
    map.get(row.user_id).items.push({
      id: row.id,
      product_name: row.product_name,
      product_price: row.product_price,
      quantity: row.quantity,
    });
  }
  return Array.from(map.values());
}

Page({
  data: {
    orderId: "",
    order: null,
    products: [],
    myItems: [],
    teamGroups: [],
    statusLabel: "",
    canAdd: false,
    canClose: false,
    loading: true,
    error: "",
  },

  onLoad(options) {
    const session = getSession();
    if (!session || !session.access_token) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    const orderId = options && options.id;
    if (!orderId) {
      this.setData({ loading: false, error: "\u62fc\u5355\u4e0d\u5b58\u5728" });
      return;
    }
    this._userId = session.user && session.user.id;
    this._isLeader = Boolean(session.is_leader);
    this.setData({ orderId });
    this.loadAll();
  },

  async loadAll() {
    const { orderId } = this.data;
    const userId = this._userId;
    this.setData({ loading: true, error: "" });
    try {
      const orders = await rest(
        `group_orders?id=eq.${orderId}&select=id,title,status,deadline,delivery_address,min_participants,creator_id`,
      );
      const order = Array.isArray(orders) ? orders[0] : null;
      if (!order) {
        throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
      }
      const canAdd = order.status === "open" || order.status === "closing";
      const isCreator = order.creator_id === userId;
      const canClose =
        canAdd && (isCreator || this._isLeader);

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
            `order_items?group_order_id=eq.${orderId}&user_id=eq.${userId}&select=id,product_name,product_price,quantity&order=created_at.desc`,
          )
        : [];

      const teamRows = await rest(
        `order_items?group_order_id=eq.${orderId}&select=id,user_id,product_name,product_price,quantity,profiles(nickname)&order=created_at.asc`,
      );

      order.deadlineShort = formatDeadlineShort(order.deadline);

      this.setData({
        order,
        products: products || [],
        myItems: myItems || [],
        teamGroups: buildTeamGroups(teamRows),
        statusLabel: STATUS_LABEL[order.status] || order.status,
        canAdd,
        canClose,
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
          wx.showToast({
            title: "\u8bf7\u8f93\u5165\u6709\u6548\u6570\u91cf",
            icon: "none",
          });
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

  onEditMyItem(e) {
    const itemId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const current = e.currentTarget.dataset.qty;
    if (!itemId || !this.data.canAdd) return;

    wx.showModal({
      title: name,
      editable: true,
      placeholderText: "\u6570\u91cf",
      content: String(current || ""),
      success: async (res) => {
        if (!res.confirm) return;
        const quantity = parseInt(res.content, 10);
        if (!quantity || quantity < 1) {
          wx.showToast({
            title: "\u8bf7\u8f93\u5165\u6709\u6548\u6570\u91cf",
            icon: "none",
          });
          return;
        }
        try {
          await requestWithAuth(
            `/api/order-items/${itemId}`,
            "PATCH",
            { quantity },
          );
          wx.showToast({ title: "\u5df2\u66f4\u65b0", icon: "success" });
          this.loadAll();
        } catch (err) {
          wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
        }
      },
    });
  },

  onDeleteMyItem(e) {
    const itemId = e.currentTarget.dataset.id;
    if (!itemId || !this.data.canAdd) return;

    wx.showModal({
      title: "\u5220\u9664\u8be5\u9009\u8d2d\uff1f",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await requestWithAuth(`/api/order-items/${itemId}`, "DELETE");
          wx.showToast({ title: "\u5df2\u5220\u9664", icon: "success" });
          this.loadAll();
        } catch (err) {
          wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
        }
      },
    });
  },

  onCloseOrder() {
    if (!this.data.canClose) return;
    wx.showModal({
      title: "\u786e\u8ba4\u622a\u6b62\u62fc\u5355\uff1f",
      content: "\u622a\u6b62\u540e\u5927\u5bb6\u65e0\u6cd5\u518d\u52a0\u8d2d\u6216\u6539\u8d2d",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await requestWithAuth(
            `/api/group-orders/${this.data.orderId}/close`,
            "POST",
          );
          wx.showToast({ title: "\u5df2\u622a\u6b62", icon: "success" });
          this.loadAll();
        } catch (err) {
          wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
        }
      },
    });
  },

  async onCopySummary() {
    try {
      const data = await requestWithAuth(
        `/api/group-orders/${this.data.orderId}/summary`,
        "GET",
      );
      if (!data || !data.text) {
        throw new Error("\u751f\u6210\u5931\u8d25");
      }
      wx.setClipboardData({
        data: data.text,
        success: () => {
          wx.showModal({
            title: "\u5df2\u590d\u5236\u6c47\u603b\u6587\u6848",
            content: "\u6253\u5f00\u5fae\u4fe1\u7fa4\uff0c\u957f\u6309\u8f93\u5165\u6846\u7c98\u8d34\u5373\u53ef\u53d1\u9001",
            showCancel: false,
          });
        },
      });
    } catch (err) {
      wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
    }
  },

  onShareAppMessage() {
    const { orderId, order } = this.data;
    return {
      title:
        order && order.title
          ? `\u62fc\u5355\uff1a${order.title}`
          : "SamGo \u62fc\u5355",
      path: `/pages/order/detail?id=${orderId}`,
    };
  },
});

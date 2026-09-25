const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");
const { rest } = require("../../utils/supabase");
const { resolveOrderIdFromOptions } = require("../../utils/order-scene");

const PENDING_ORDER_KEY = "samgo_pending_order_id";

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

function mergeProductsWithMyItems(products, myItems) {
  const byName = new Map();
  for (const row of myItems || []) {
    const key = row.product_name;
    if (!byName.has(key)) {
      byName.set(key, { id: row.id, quantity: 0 });
    }
    const entry = byName.get(key);
    entry.quantity += row.quantity || 0;
    entry.id = row.id;
  }
  return (products || []).map((p) => {
    const cart = byName.get(p.name);
    return {
      ...p,
      myQty: cart ? cart.quantity : 0,
      myItemId: cart ? cart.id : "",
    };
  });
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

function buildProductTotals(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const name = row.product_name;
    const price = Number(row.product_price);
    const q = row.quantity || 0;
    if (!map.has(name)) {
      map.set(name, {
        product_name: name,
        quantity: 0,
        amount: 0,
        unit_price: price,
      });
    }
    const entry = map.get(name);
    entry.quantity += q;
    entry.amount += price * q;
  }
  const list = Array.from(map.values());
  list.sort(function (a, b) {
    return a.product_name.localeCompare(b.product_name, "zh-CN");
  });
  let totalAmount = 0;
  for (let i = 0; i < list.length; i++) {
    list[i].amountText = list[i].amount.toFixed(2);
    totalAmount += list[i].amount;
  }
  return { list, totalAmount: totalAmount.toFixed(2) };
}

Page({
  data: {
    orderId: "",
    order: null,
    products: [],
    myItems: [],
    teamGroups: [],
    productTotals: [],
    totalAmount: "0.00",
    statusLabel: "",
    canAdd: false,
    canMinus: false,
    canClose: false,
    loading: true,
    error: "",
    wxacodeVisible: false,
    wxacodeSrc: "",
    wxacodeLoading: false,
  },

  onLoad(options) {
    const orderId = resolveOrderIdFromOptions(options);
    if (!orderId) {
      this.setData({ loading: false, error: "\u62fc\u5355\u4e0d\u5b58\u5728" });
      return;
    }
    const session = getSession();
    if (!session || !session.access_token) {
      try {
        wx.setStorageSync(PENDING_ORDER_KEY, orderId);
      } catch (_e) {}
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this._userId = session.user && session.user.id;
    this._isLeader = Boolean(session.is_leader);
    this.setData({ orderId });
    this.loadAll();
  },

  async loadAll(options) {
    const silent = options && options.silent;
    const { orderId } = this.data;
    const userId = this._userId;
    if (!silent) {
      this.setData({ loading: true, error: "" });
    }
    try {
      await requestWithAuth("/api/group-orders/close-expired", "POST").catch(
        () => {},
      );
      const orders = await rest(
        `group_orders?id=eq.${orderId}&select=id,title,status,deadline,delivery_address,min_participants,creator_id`,
      );
      const order = Array.isArray(orders) ? orders[0] : null;
      if (!order) {
        throw new Error("\u62fc\u5355\u4e0d\u5b58\u5728");
      }
      const canAdd = order.status === "open" || order.status === "closing";
      const isCreator = order.creator_id === userId;
      const canMinus = isCreator || this._isLeader;
      const canClose = canAdd && canMinus;

      let products = [];
      const links = await rest(
        `group_order_products?group_order_id=eq.${orderId}&select=sort_order,products(id,name,price,image_url,category,unit)&order=sort_order.asc`,
      );
      if (Array.isArray(links) && links.length > 0) {
        products = links.map((row) => row.products).filter(Boolean);
      } else {
        products = await rest("products?select=*&order=name.asc");
      }

      const myItemsRaw = userId
        ? await rest(
            `order_items?group_order_id=eq.${orderId}&user_id=eq.${userId}&select=id,product_name,product_price,quantity&order=created_at.desc`,
          )
        : [];
      const myItems = myItemsRaw || [];
      products = mergeProductsWithMyItems(products, myItems);

      const teamRows = await rest(
        `order_items?group_order_id=eq.${orderId}&select=id,user_id,product_name,product_price,quantity,profiles(nickname)&order=created_at.asc`,
      );

      order.deadlineShort = formatDeadlineShort(order.deadline);
      const totals = buildProductTotals(teamRows);

      this.setData({
        order,
        products: products || [],
        myItems,
        teamGroups: buildTeamGroups(teamRows),
        productTotals: totals.list,
        totalAmount: totals.totalAmount,
        statusLabel: STATUS_LABEL[order.status] || order.status,
        canAdd,
        canMinus,
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

  async _applyItemQuantity(productId, itemId, currentQty, nextQty) {
    if (this._qtyBusy) return;
    if (nextQty < currentQty && !this.data.canMinus) {
      wx.showToast({
        title: "\u53c2\u4e0e\u62fc\u5355\u53ea\u53ef\u52a0\u8d2d",
        icon: "none",
      });
      return;
    }
    this._qtyBusy = true;
    try {
      if (nextQty < 1) {
        if (!itemId) return;
        await requestWithAuth(`/api/order-items/${itemId}`, "DELETE");
      } else if (!itemId) {
        if (!productId) return;
        await requestWithAuth("/api/order-items", "POST", {
          group_order_id: this.data.orderId,
          product_id: productId,
          quantity: nextQty,
        });
      } else {
        await requestWithAuth(`/api/order-items/${itemId}`, "PATCH", {
          quantity: nextQty,
        });
      }
      await this.loadAll({ silent: true });
    } catch (err) {
      wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
    } finally {
      this._qtyBusy = false;
    }
  },

  onQtyPlus(e) {
    if (!this.data.canAdd) return;
    const productId = e.currentTarget.dataset.productId;
    const itemId = e.currentTarget.dataset.itemId || "";
    const qty = parseInt(e.currentTarget.dataset.qty, 10) || 0;
    this._applyItemQuantity(productId, itemId, qty, qty + 1);
  },

  onQtyMinus(e) {
    if (!this.data.canAdd || !this.data.canMinus) return;
    const productId = e.currentTarget.dataset.productId;
    const itemId = e.currentTarget.dataset.itemId || "";
    const qty = parseInt(e.currentTarget.dataset.qty, 10) || 0;
    if (qty < 1) return;
    this._applyItemQuantity(productId, itemId, qty, qty - 1);
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

  async onShowWxacode() {
    if (this.data.wxacodeLoading) return;
    this.setData({ wxacodeVisible: true, wxacodeLoading: true, wxacodeSrc: "" });
    try {
      const data = await requestWithAuth(
        `/api/group-orders/${this.data.orderId}/wxacode`,
        "GET",
      );
      if (!data || !data.image_base64) {
        throw new Error("\u751f\u6210\u5931\u8d25");
      }
      this.setData({
        wxacodeSrc: "data:image/png;base64," + data.image_base64,
        wxacodeLoading: false,
      });
    } catch (err) {
      this.setData({ wxacodeVisible: false, wxacodeLoading: false });
      wx.showToast({ title: err.message || "\u5931\u8d25", icon: "none" });
    }
  },

  onCloseWxacode() {
    this.setData({ wxacodeVisible: false });
  },

  onSaveWxacode() {
    const src = this.data.wxacodeSrc;
    if (!src) return;
    const fs = wx.getFileSystemManager();
    const path = `${wx.env.USER_DATA_PATH}/samgo-wxacode-${Date.now()}.png`;
    const base64 = src.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFile({
      filePath: path,
      data: base64,
      encoding: "base64",
      success: () => {
        wx.saveImageToPhotosAlbum({
          filePath: path,
          success: () => {
            wx.showToast({ title: "\u5df2\u4fdd\u5b58\u5230\u76f8\u518c", icon: "success" });
          },
          fail: () => {
            wx.showToast({
              title: "\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u5141\u8bb8\u4fdd\u5b58\u76f8\u518c",
              icon: "none",
            });
          },
        });
      },
      fail: () => {
        wx.showToast({ title: "\u4fdd\u5b58\u5931\u8d25", icon: "none" });
      },
    });
  },
});

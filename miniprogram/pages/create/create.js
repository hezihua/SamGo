const { getSession } = require("../../utils/auth");
const { requestWithAuth } = require("../../utils/api");

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    title: "",
    deliveryAddress: "",
    date: "",
    time: "18:00",
    minParticipants: "2",
    today: "",
    loading: false,
    error: "",
  },

  onLoad() {
    const session = getSession();
    if (!session?.access_token) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }
    if (!session.is_leader) {
      wx.showToast({ title: "\u4ec5\u56e2\u957f\u53ef\u53d1\u8d77\u62fc\u5355", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ today: todayString() });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onAddressInput(e) {
    this.setData({ deliveryAddress: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  onMinInput(e) {
    this.setData({ minParticipants: e.detail.value });
  },

  onSubmit() {
    const { title, deliveryAddress, date, time, minParticipants, loading } =
      this.data;
    if (loading) return;

    const trimmedTitle = (title || "").trim();
    const trimmedAddress = (deliveryAddress || "").trim();
    if (!trimmedTitle) {
      this.setData({ error: "\u8bf7\u8f93\u5165\u62fc\u5355\u6807\u9898" });
      return;
    }
    if (!trimmedAddress) {
      this.setData({ error: "\u8bf7\u8f93\u5165\u53d6\u8d27\u5730\u5740" });
      return;
    }
    if (!date) {
      this.setData({ error: "\u8bf7\u9009\u62e9\u622a\u6b62\u65e5\u671f" });
      return;
    }

    const min = parseInt(minParticipants, 10);
    if (!min || min < 2) {
      this.setData({ error: "\u6700\u5c11\u4eba\u6570\u81f3\u5c11\u4e3a 2" });
      return;
    }

    const session = getSession();
    if (!session?.user?.id) {
      wx.redirectTo({ url: "/pages/login/login" });
      return;
    }

    const deadline = `${date}T${time}:00+08:00`;

    this.setData({ loading: true, error: "" });

    requestWithAuth("/api/group-orders", "POST", {
      title: trimmedTitle,
      delivery_address: trimmedAddress,
      deadline,
      min_participants: min,
    })
      .then((result) => {
        if (!result?.order?.id) {
          throw new Error("\u521b\u5efa\u5931\u8d25");
        }
      })
      .then(() => {
        wx.showToast({ title: "\u53d1\u5e03\u6210\u529f", icon: "success" });
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        this.setData({
          error: err.message || "\u53d1\u5e03\u5931\u8d25",
          loading: false,
        });
      });
  },
});

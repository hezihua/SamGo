const DEFAULT_SHARE = {
  title: "邻居拼单小分队 · 山姆邻居拼单",
  path: "/pages/home/home",
};

/** 未实现分享回调时，菜单里「转发给朋友 / 分享到朋友圈」会变灰 */
function enableShareMenu() {
  if (typeof wx.showShareMenu !== "function") return;
  wx.showShareMenu({
    withShareTicket: false,
    menus: ["shareAppMessage", "shareTimeline"],
  });
}

/**
 * 为 Page 配置补上默认分享（拼单详情等已自定义 onShare* 的页面不覆盖）
 */
function bindDefaultShare(pageOptions) {
  const origOnLoad = pageOptions.onLoad;
  const origOnShow = pageOptions.onShow;

  if (!pageOptions.onShareAppMessage) {
    pageOptions.onShareAppMessage = function onShareAppMessage() {
      const custom =
        typeof this.getShareMessage === "function"
          ? this.getShareMessage()
          : null;
      return custom || { ...DEFAULT_SHARE };
    };
  }

  if (!pageOptions.onShareTimeline) {
    pageOptions.onShareTimeline = function onShareTimeline() {
      const custom =
        typeof this.getShareTimeline === "function"
          ? this.getShareTimeline()
          : null;
      return custom || { title: DEFAULT_SHARE.title };
    };
  }

  pageOptions.onLoad = function onLoad(options) {
    enableShareMenu();
    if (typeof origOnLoad === "function") {
      origOnLoad.call(this, options);
    }
  };

  if (typeof origOnShow === "function") {
    pageOptions.onShow = function onShow() {
      enableShareMenu();
      return origOnShow.call(this);
    };
  } else if (!origOnLoad) {
    pageOptions.onShow = function onShow() {
      enableShareMenu();
    };
  }

  return pageOptions;
}

module.exports = {
  DEFAULT_SHARE,
  enableShareMenu,
  bindDefaultShare,
};
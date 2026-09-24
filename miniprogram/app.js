const { getSession } = require("./utils/auth");

App({
  onLaunch() {
    this.globalData.session = getSession();
  },
  globalData: {
    session: null,
  },
});

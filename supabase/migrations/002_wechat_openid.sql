-- 微信小程序 openid 绑定
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wechat_openid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wechat_openid
  ON profiles (wechat_openid)
  WHERE wechat_openid IS NOT NULL;

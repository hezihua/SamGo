-- 快速修复：关闭 auth 自动写 profiles（由 Next /api/wechat/login upsert 负责）
-- 若 003 仍报 Database error creating new user，可先只执行本文件。

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

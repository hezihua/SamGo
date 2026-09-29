-- 驳回说明（管理员填写，用户可在小程序查看）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS review_note TEXT;

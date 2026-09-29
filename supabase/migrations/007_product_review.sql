-- 商品审核：小程序提交 pending，管理后台通过后为 approved
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_review_status_check;
ALTER TABLE products
  ADD CONSTRAINT products_review_status_check
  CHECK (review_status IN ('approved', 'pending', 'rejected'));

UPDATE products SET review_status = 'approved' WHERE review_status IS NULL;

-- 客户端只读已上架商品；写入仅服务端（service role）
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products
  FOR SELECT USING (review_status = 'approved');

DROP POLICY IF EXISTS "products_insert" ON products;

CREATE INDEX IF NOT EXISTS idx_products_review_status ON products(review_status);

-- 拼单可选商品（发起时从 products 库勾选，详情页仅展示这些商品）

CREATE TABLE IF NOT EXISTS group_order_products (
  group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_group_order_products_order
  ON group_order_products(group_order_id);

ALTER TABLE group_order_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_order_products_select" ON group_order_products;
CREATE POLICY "group_order_products_select" ON group_order_products
  FOR SELECT USING (true);

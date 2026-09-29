-- 本单成交价（与商品库参考价分离）
ALTER TABLE group_order_products
  ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);

UPDATE group_order_products gop
SET unit_price = p.price
FROM products p
WHERE gop.product_id = p.id
  AND gop.unit_price IS NULL;

ALTER TABLE group_order_products
  ALTER COLUMN unit_price SET NOT NULL;

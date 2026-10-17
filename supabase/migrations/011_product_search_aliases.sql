-- 商品搜索别名（逗号分隔，如「香蕉,蕉」），供小程序/服务端模糊搜索
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_aliases TEXT;

COMMENT ON COLUMN products.search_aliases IS 'Comma-separated search keywords; matched with name via API ilike';

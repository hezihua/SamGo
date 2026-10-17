-- 山姆分享海报原图 URL（识图后 image_url 为裁切主图，poster_url 保留复核/重识）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

COMMENT ON COLUMN products.poster_url IS 'Original Sam poster OSS URL (e.g. product-submissions/)';

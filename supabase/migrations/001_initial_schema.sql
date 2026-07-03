-- SamGo 山姆拼单数据库 Schema

-- 用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 拼单活动表
CREATE TABLE IF NOT EXISTS group_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'completed')),
  delivery_address TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  min_participants INT NOT NULL DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 商品库（山姆常见商品）
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT '其他',
  unit TEXT NOT NULL DEFAULT '件',
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 拼单参与者
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_order_id, user_id)
);

-- 拼单选购项
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_group_orders_status ON group_orders(status);
CREATE INDEX IF NOT EXISTS idx_group_orders_deadline ON group_orders(deadline);
CREATE INDEX IF NOT EXISTS idx_order_items_group_order ON order_items(group_order_id);
CREATE INDEX IF NOT EXISTS idx_participants_group_order ON participants(group_order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS group_orders_updated_at ON group_orders;
CREATE TRIGGER group_orders_updated_at
  BEFORE UPDATE ON group_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- profiles 策略
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- group_orders 策略
DROP POLICY IF EXISTS "group_orders_select" ON group_orders;
DROP POLICY IF EXISTS "group_orders_insert" ON group_orders;
DROP POLICY IF EXISTS "group_orders_update" ON group_orders;
CREATE POLICY "group_orders_select" ON group_orders FOR SELECT USING (true);
CREATE POLICY "group_orders_insert" ON group_orders FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "group_orders_update" ON group_orders FOR UPDATE USING (auth.uid() = creator_id);

-- products 策略
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- participants 策略
DROP POLICY IF EXISTS "participants_select" ON participants;
DROP POLICY IF EXISTS "participants_insert" ON participants;
DROP POLICY IF EXISTS "participants_delete" ON participants;
CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants_delete" ON participants FOR DELETE USING (auth.uid() = user_id);

-- order_items 策略
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_update" ON order_items;
DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE USING (auth.uid() = user_id);

-- 预置山姆热门商品（已存在则跳过）
INSERT INTO products (name, price, category, unit, description)
SELECT v.name, v.price, v.category, v.unit, v.description
FROM (VALUES
  ('Member''s Mark 瑞士卷', 59.80, '烘焙', '盒', '16片装，原味+巧克力味'),
  ('Member''s Mark 牛肉卷', 69.80, '烘焙', '盒', '4个装，经典牛肉卷'),
  ('Member''s Mark 烤鸡', 39.80, '生鲜', '只', '整只烤鸡，现烤现卖'),
  ('Member''s Mark 混合坚果', 99.00, '零食', '罐', '1.1kg大罐装'),
  ('Member''s Mark 全脂牛奶', 59.90, '饮料', '箱', '2L×2 全脂牛奶'),
  ('Member''s Mark 橙汁', 19.90, '饮料', '瓶', '2.5L 鲜榨橙汁'),
  ('Member''s Mark 虾片', 39.90, '零食', '袋', '蒜香味虾片 454g'),
  ('Member''s Mark 榴莲千层', 88.00, '烘焙', '盒', '8寸榴莲千层蛋糕'),
  ('Member''s Mark 鸡胸肉', 49.90, '生鲜', '袋', '去皮鸡胸肉 2kg'),
  ('Member''s Mark 洗衣液', 79.90, '日用品', '瓶', '2.75L 浓缩洗衣液'),
  ('Member''s Mark 维生素C', 89.00, '保健品', '瓶', '500片装维生素C'),
  ('Member''s Mark 黄油曲奇', 49.90, '零食', '盒', '454g 黄油曲奇饼干')
) AS v(name, price, category, unit, description)
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.name = v.name
);

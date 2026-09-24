-- 拼单仅允许服务端（团长 API）创建；群友不能直接 INSERT group_orders
DROP POLICY IF EXISTS "group_orders_insert" ON group_orders;

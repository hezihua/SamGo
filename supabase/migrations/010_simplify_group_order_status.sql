-- 拼单状态简化为 open / closed
UPDATE group_orders
SET status = 'closed'
WHERE status IN ('closing', 'completed');

ALTER TABLE group_orders DROP CONSTRAINT IF EXISTS group_orders_status_check;
ALTER TABLE group_orders
  ADD CONSTRAINT group_orders_status_check
  CHECK (status IN ('open', 'closed'));

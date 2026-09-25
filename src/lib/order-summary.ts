type SummaryOrder = {
  title: string;
  delivery_address: string;
  deadline: string;
};

export type SummaryItemRow = {
  user_id: string;
  product_name: string;
  product_price: number | string;
  quantity: number;
  profiles?: { nickname: string | null } | null;
};

function money(n: number): string {
  return n.toFixed(2);
}

function lineTotal(price: number | string, qty: number): number {
  return Number(price) * qty;
}

export function buildOrderSummaryText(
  order: SummaryOrder,
  items: SummaryItemRow[],
): string {
  const lines: string[] = [];
  lines.push(`\u3010SamGo \u62fc\u5355\u6c47\u603b\u3011${order.title}`);
  lines.push(`\u53d6\u8d27\uff1a${order.delivery_address}`);
  lines.push(`\u622a\u6b62\uff1a${order.deadline}`);
  lines.push("");

  if (items.length === 0) {
    lines.push("\uff08\u6682\u65e0\u9009\u8d2d\uff09");
    return lines.join("\n");
  }

  lines.push("\u2014\u2014 \u6309\u4eba \u2014\u2014");
  const byUser = new Map<
    string,
    { name: string; rows: SummaryItemRow[]; subtotal: number }
  >();

  for (const row of items) {
    const name = row.profiles?.nickname?.trim() || "\u62fc\u53cb";
    let bucket = byUser.get(row.user_id);
    if (!bucket) {
      bucket = { name, rows: [], subtotal: 0 };
      byUser.set(row.user_id, bucket);
    }
    bucket.rows.push(row);
    bucket.subtotal += lineTotal(row.product_price, row.quantity);
  }

  let grand = 0;
  for (const { name, rows, subtotal } of byUser.values()) {
    grand += subtotal;
    const parts = rows.map(
      (r) =>
        `${r.product_name}\u00d7${r.quantity}\uff08\u00a5${money(lineTotal(r.product_price, r.quantity))}\uff09`,
    );
    lines.push(
      `${name}\uff1a${parts.join("\uff1b")} \u5c0f\u8ba1 \u00a5${money(subtotal)}`,
    );
  }

  lines.push("");
  lines.push("\u2014\u2014 \u6309\u5546\u54c1 \u2014\u2014");
  const byProduct = new Map<string, { qty: number; amount: number }>();
  for (const row of items) {
    const cur = byProduct.get(row.product_name) ?? { qty: 0, amount: 0 };
    cur.qty += row.quantity;
    cur.amount += lineTotal(row.product_price, row.quantity);
    byProduct.set(row.product_name, cur);
  }
  for (const [name, { qty, amount }] of byProduct) {
    lines.push(`${name}\uff1a\u5171 ${qty} \u4ef6\uff0c\u00a5${money(amount)}`);
  }

  lines.push("");
  lines.push(`\u5408\u8ba1\uff1a\u00a5${money(grand)}`);
  return lines.join("\n");
}

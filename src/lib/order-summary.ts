import { formatDate, formatPrice } from "@/lib/utils";
import type { GroupOrder, OrderItem, Profile } from "@/types/database";

type ItemWithProfile = OrderItem & { profile: Profile | null };

export function aggregateByProduct(items: ItemWithProfile[]) {
  const map = new Map<
    string,
    { name: string; quantity: number; unitPrice: number }
  >();

  for (const item of items) {
    const key = `${item.product_name}::${item.product_price}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, {
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.product_price),
      });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function aggregateByPerson(items: ItemWithProfile[]) {
  const map = new Map<
    string,
    { userId: string; nickname: string; total: number; lines: string[] }
  >();

  for (const item of items) {
    const nickname = item.profile?.nickname || "用户";
    const lineTotal = Number(item.product_price) * item.quantity;
    const line = `${item.product_name} ×${item.quantity} ${formatPrice(lineTotal)}`;

    const existing = map.get(item.user_id);
    if (existing) {
      existing.total += lineTotal;
      existing.lines.push(line);
    } else {
      map.set(item.user_id, {
        userId: item.user_id,
        nickname,
        total: lineTotal,
        lines: [line],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function totalAmount(items: ItemWithProfile[]) {
  return items.reduce(
    (sum, item) => sum + Number(item.product_price) * item.quantity,
    0
  );
}

export function buildShareInviteText(
  order: GroupOrder,
  orderUrl: string
): string {
  const lines = [
    `【山姆拼单】${order.title}`,
    `截止：${formatDate(order.deadline)}`,
    `取货：${order.delivery_address}`,
  ];
  if (order.description?.trim()) {
    lines.push(order.description.trim());
  }
  lines.push("", "👉 参与链接：", orderUrl, "", "打开链接登录后选商品，截止前可自行修改。");
  return lines.join("\n");
}

export function buildProcurementSummaryText(
  order: GroupOrder,
  items: ItemWithProfile[]
): string {
  const products = aggregateByProduct(items);
  const total = totalAmount(items);
  const lines = [`【采购汇总】${order.title}`, ""];

  if (products.length === 0) {
    lines.push("（暂无商品）");
  } else {
    for (const p of products) {
      lines.push(`${p.name} ×${p.quantity}`);
    }
  }

  lines.push("", `合计：${formatPrice(total)}`);
  return lines.join("\n");
}

export function buildPerPersonSummaryText(
  order: GroupOrder,
  items: ItemWithProfile[]
): string {
  const people = aggregateByPerson(items);
  const total = totalAmount(items);
  const lines = [`【每人应付】${order.title}`, ""];

  if (people.length === 0) {
    lines.push("（暂无参与）");
  } else {
    for (const p of people) {
      lines.push(`${p.nickname} ${formatPrice(p.total)}`);
    }
  }

  lines.push("", `合计：${formatPrice(total)}`, "", "请在群内转账后备注昵称。");
  return lines.join("\n");
}

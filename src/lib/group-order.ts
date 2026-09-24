import type { GroupOrder, OrderStatus } from "@/types/database";

export function isOrderLocked(
  order: Pick<GroupOrder, "status" | "deadline">
): boolean {
  if (order.status === "closed" || order.status === "completed") {
    return true;
  }
  return new Date(order.deadline).getTime() < Date.now();
}

export function isOrderEditableStatus(status: OrderStatus): boolean {
  return status === "open" || status === "closing";
}

export const GROUP_ORDER_ACTIVE = "open" as const;
export const GROUP_ORDER_CLOSED = "closed" as const;

export function isGroupOrderOpen(status: string): boolean {
  return status === GROUP_ORDER_ACTIVE || status === "closing";
}

export function groupOrderStatusLabel(status: string): string {
  if (status === GROUP_ORDER_ACTIVE || status === "closing") {
    return "\u8fdb\u884c\u4e2d";
  }
  return "\u5df2\u622a\u6b62";
}

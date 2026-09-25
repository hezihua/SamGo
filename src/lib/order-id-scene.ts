export function orderIdToScene(orderId: string): string {
  return orderId.replace(/-/g, "").toLowerCase();
}

export function sceneToOrderId(scene: string): string | null {
  const raw = decodeURIComponent(scene).trim();
  if (/^[0-9a-f]{32}$/i.test(raw)) {
    const s = raw.toLowerCase();
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  if (raw.indexOf("id=") === 0) {
    const id = raw.slice(3);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
  }
  return null;
}

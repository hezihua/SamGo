export type OrderStatus = "open" | "closing" | "closed" | "completed";
export type ItemStatus = "pending" | "confirmed" | "cancelled";

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface GroupOrder {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  status: OrderStatus;
  delivery_address: string;
  deadline: string;
  min_participants: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  unit: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  group_order_id: string;
  user_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
  status: ItemStatus;
  created_at: string;
}

export interface Participant {
  id: string;
  group_order_id: string;
  user_id: string;
  joined_at: string;
}

export interface GroupOrderWithDetails extends GroupOrder {
  creator: Profile | null;
  participants: (Participant & { profile: Profile | null })[];
  items: (OrderItem & { profile: Profile | null })[];
  participant_count: number;
  total_amount: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: "进行中",
  closing: "即将截止",
  closed: "已截止",
  completed: "已完成",
};

export const PRODUCT_CATEGORIES = [
  "零食",
  "饮料",
  "生鲜",
  "烘焙",
  "日用品",
  "保健品",
  "其他",
] as const;

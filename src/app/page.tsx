import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { OrderCard } from "@/components/order-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";

async function getOrders() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("group_orders")
    .select(`
      *,
      creator:profiles!group_orders_creator_id_fkey(nickname)
    `)
    .order("created_at", { ascending: false });

  if (error || !orders) return [];

  const enriched = await Promise.all(
    orders.map(async (order) => {
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("group_order_id", order.id);

      const { data: items } = await supabase
        .from("order_items")
        .select("product_price, quantity")
        .eq("group_order_id", order.id)
        .neq("status", "cancelled");

      const total_amount = items?.reduce(
        (sum, item) => sum + Number(item.product_price) * item.quantity,
        0
      ) ?? 0;

      return {
        ...order,
        participant_count: count ?? 0,
        total_amount,
      };
    })
  );

  return enriched;
}

export default async function HomePage() {
  const orders = await getOrders();
  const openOrders = orders.filter(
    (o) => o.status === "open" || o.status === "closing"
  );
  const pastOrders = orders.filter(
    (o) => o.status === "closed" || o.status === "completed"
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-10 rounded-2xl bg-gradient-to-br from-sams-blue to-sams-blue-dark p-8 text-white">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">山姆超市拼单</h1>
              <p className="mt-2 text-white/80 max-w-lg">
                和朋友一起拼单买山姆好物，瑞士卷、牛肉卷、烤鸡… 省钱又方便，一起享受 Member&apos;s Mark 品质生活。
              </p>
            </div>
            <Link href="/orders/new">
              <Button
                size="lg"
                className="bg-white text-sams-blue hover:bg-white/90 shrink-0"
              >
                <Plus className="h-5 w-5" />
                发起拼单
              </Button>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-sams-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-sams-blue" />
            进行中的拼单
            <span className="text-sm font-normal text-sams-gray-500">
              ({openOrders.length})
            </span>
          </h2>
          {openOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-sams-gray-300 p-12 text-center">
              <p className="text-sams-gray-500">暂无进行中的拼单</p>
              <Link href="/orders/new" className="mt-4 inline-block">
                <Button variant="outline">成为第一个发起人</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {openOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        {pastOrders.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-sams-gray-900">
              历史拼单
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {pastOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

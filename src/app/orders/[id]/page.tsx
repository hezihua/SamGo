import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { OrderDetail } from "@/components/order-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function orderShareUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return base ? `${base}/orders/${id}` : undefined;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("group_orders")
    .select("title, delivery_address, deadline")
    .eq("id", id)
    .single();

  if (!order) {
    return { title: "拼单不存在 | SamGo" };
  }

  const description = `截止 ${formatDate(order.deadline)} · 取货 ${order.delivery_address}`;

  return {
    title: `${order.title} | SamGo 山姆拼单`,
    description,
    openGraph: {
      title: order.title,
      description,
      type: "website",
    },
  };
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: order, error } = await supabase
    .from("group_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  const { data: creator } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", order.creator_id)
    .single();

  const { data: participants } = await supabase
    .from("participants")
    .select(`
      *,
      profile:profiles!participants_user_id_fkey(*)
    `)
    .eq("group_order_id", id);

  const { data: items } = await supabase
    .from("order_items")
    .select(`
      *,
      profile:profiles!order_items_user_id_fkey(*)
    `)
    .eq("group_order_id", id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("category");

  const isParticipant =
    participants?.some((p) => p.user_id === user?.id) ?? false;
  const isCreator = user?.id === order.creator_id;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-8 sm:pb-8">
        <Link href="/" className="mb-6 inline-block">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            返回首页
          </Button>
        </Link>

        <OrderDetail
          order={order}
          creator={creator}
          participants={participants ?? []}
          items={items ?? []}
          products={products ?? []}
          currentUserId={user?.id ?? null}
          isParticipant={isParticipant}
          isCreator={isCreator}
          shareBaseUrl={orderShareUrl(id)}
        />
      </main>
    </>
  );
}

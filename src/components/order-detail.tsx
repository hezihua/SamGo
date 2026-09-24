"use client";

import { joinGroupOrder, removeOrderItem, updateOrderStatus } from "@/app/actions/orders";
import { AddItemForm } from "@/components/add-item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderShareActions } from "@/components/order-share-actions";
import { isOrderLocked } from "@/lib/group-order";
import {
  aggregateByProduct,
  aggregateByPerson,
} from "@/lib/order-summary";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  type GroupOrder,
  type OrderItem,
  type Participant,
  type Product,
  type Profile,
} from "@/types/database";
import {
  Clock,
  MapPin,
  Users,
  Trash2,
  UserPlus,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface OrderDetailProps {
  order: GroupOrder;
  creator: Profile | null;
  participants: (Participant & { profile: Profile | null })[];
  items: (OrderItem & { profile: Profile | null })[];
  products: Product[];
  currentUserId: string | null;
  isParticipant: boolean;
  isCreator: boolean;
  shareBaseUrl?: string;
}

export function OrderDetail({
  order,
  creator,
  participants,
  items,
  products,
  currentUserId,
  isParticipant,
  isCreator,
  shareBaseUrl,
}: OrderDetailProps) {
  const [joining, setJoining] = useState(false);
  const locked = isOrderLocked(order);
  const isClosed = order.status === "closed" || order.status === "completed";
  const canAddItems = isParticipant && !locked;
  const pastDeadline =
    !isClosed &&
    locked &&
    new Date(order.deadline).getTime() < Date.now();

  const byProduct = aggregateByProduct(items);
  const byPerson = aggregateByPerson(items);

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.product_price) * item.quantity,
    0
  );

  const itemsByUser = items.reduce<
    Record<string, { profile: Profile | null; items: typeof items; total: number }>
  >((acc, item) => {
    if (!acc[item.user_id]) {
      acc[item.user_id] = {
        profile: item.profile,
        items: [],
        total: 0,
      };
    }
    acc[item.user_id].items.push(item);
    acc[item.user_id].total +=
      Number(item.product_price) * item.quantity;
    return acc;
  }, {});

  async function handleJoin() {
    setJoining(true);
    await joinGroupOrder(order.id);
    setJoining(false);
  }

  async function handleRemoveItem(itemId: string) {
    await removeOrderItem(itemId, order.id);
  }

  async function handleStatusChange(
    status: "open" | "closing" | "closed" | "completed"
  ) {
    await updateOrderStatus(order.id, status);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={order.status}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                {creator && (
                  <span className="text-sm text-sams-gray-500">
                    发起人：{creator.nickname}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-sams-gray-900">
                {order.title}
              </h1>
              {order.description && (
                <p className="mt-2 text-sams-gray-600">{order.description}</p>
              )}
            </div>

            {isCreator && !locked && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("closing")}
                >
                  标记即将截止
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange("closed")}
                >
                  <XCircle className="h-4 w-4" />
                  截止拼单
                </Button>
              </div>
            )}
            {isCreator && order.status === "closed" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("completed")}
              >
                <CheckCircle className="h-4 w-4" />
                标记完成
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-sams-gray-600">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-sams-blue" />
              截止：{formatDate(order.deadline)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sams-blue" />
              {order.delivery_address}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sams-blue" />
              {participants.length} 人参与（最低 {order.min_participants} 人）
            </span>
          </div>

          {order.notes && (
            <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              📌 {order.notes}
            </p>
          )}

          {pastDeadline && (
            <p className="mt-4 rounded-lg border border-sams-gray-200 bg-sams-gray-100 p-3 text-sm text-sams-gray-700">
              已过截止时间，清单已锁定。发起人可在上方点击「截止拼单」标记本期结束。
            </p>
          )}

          {locked && !pastDeadline && isClosed && (
            <p className="mt-4 rounded-lg border border-sams-gray-200 bg-sams-gray-100 p-3 text-sm text-sams-gray-700">
              本期已截止，清单不可再修改。可复制下方汇总发群核对。
            </p>
          )}

          <div className="mt-6 flex items-center justify-between rounded-lg bg-sams-blue/5 p-4">
            <span className="text-sm text-sams-gray-600">拼单总金额</span>
            <span className="text-2xl font-bold text-sams-blue">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="hidden sm:block">
        <OrderShareActions
          order={order}
          items={items}
          shareBaseUrl={shareBaseUrl}
        />
      </div>

      {!currentUserId && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sams-gray-600 mb-4">登录后即可参与此拼单</p>
            <a href="/login">
              <Button>登录参与</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {currentUserId && !isParticipant && !locked && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <p className="text-sams-gray-600">加入拼单，选购你想要的商品</p>
            <Button onClick={handleJoin} disabled={joining}>
              <UserPlus className="h-4 w-4" />
              {joining ? "加入中..." : "加入拼单"}
            </Button>
          </CardContent>
        </Card>
      )}

      {canAddItems && (
        <Card>
          <CardHeader>
            <CardTitle>添加商品</CardTitle>
          </CardHeader>
          <CardContent>
            <AddItemForm
              orderId={order.id}
              products={products}
              disabled={locked}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sams-blue" />
            参与者 ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full bg-sams-gray-100 px-3 py-1 text-sm text-sams-gray-700"
              >
                {p.profile?.nickname || "用户"}
                {p.user_id === order.creator_id && (
                  <span className="ml-1 text-xs text-sams-blue">发起人</span>
                )}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {(byProduct.length > 0 || locked) && (
        <Card>
          <CardHeader>
            <CardTitle>采购汇总</CardTitle>
          </CardHeader>
          <CardContent>
            {byProduct.length === 0 ? (
              <p className="text-center text-sm text-sams-gray-500 py-4">
                暂无商品
              </p>
            ) : (
              <ul className="space-y-2">
                {byProduct.map((p) => (
                  <li
                    key={`${p.name}-${p.unitPrice}`}
                    className="flex items-center justify-between rounded-lg bg-sams-gray-50 px-3 py-2.5 text-sm min-h-11"
                  >
                    <span className="text-sams-gray-900">{p.name}</span>
                    <span className="font-medium text-sams-gray-700">
                      ×{p.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>选购清单</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(itemsByUser).length === 0 ? (
            <p className="text-center text-sams-gray-500 py-8">
              还没有人添加商品，快来第一个选购吧！
            </p>
          ) : (
            Object.entries(itemsByUser).map(([userId, { profile, items: userItems, total }]) => (
              <div key={userId} className="border-b border-sams-gray-100 pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sams-gray-900">
                    {profile?.nickname || "用户"}
                  </h4>
                  <span className="text-sm font-semibold text-sams-blue">
                    {formatPrice(total)}
                  </span>
                </div>
                <ul className="space-y-2">
                  {userItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-sams-gray-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="text-sams-gray-900">
                          {item.product_name}
                        </span>
                        <span className="ml-2 text-sams-gray-500">
                          ×{item.quantity}
                        </span>
                        {item.notes && (
                          <span className="ml-2 text-xs text-sams-gray-400">
                            ({item.notes})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sams-gray-700">
                          {formatPrice(
                            Number(item.product_price) * item.quantity
                          )}
                        </span>
                        {currentUserId === item.user_id && !locked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {byPerson.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>每人应付</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byPerson.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between rounded-lg border border-sams-gray-100 px-3 py-3 min-h-11"
              >
                <span className="font-medium text-sams-gray-900">
                  {p.nickname}
                </span>
                <span className="text-lg font-semibold text-sams-blue">
                  {formatPrice(p.total)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <OrderShareActions
        order={order}
        items={items}
        shareBaseUrl={shareBaseUrl}
        compact
      />
    </div>
  );
}

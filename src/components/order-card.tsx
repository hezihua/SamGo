import Link from "next/link";
import { Users, MapPin, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type GroupOrder } from "@/types/database";

interface OrderCardProps {
  order: GroupOrder & {
    creator?: { nickname: string } | null;
    participant_count?: number;
    total_amount?: number;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const isExpired = new Date(order.deadline) < new Date();
  const status = isExpired && order.status === "open" ? "closing" : order.status;

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="group transition-all hover:shadow-md hover:border-sams-blue/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={status}>{ORDER_STATUS_LABELS[status]}</Badge>
                {order.creator && (
                  <span className="text-xs text-sams-gray-500">
                    发起人：{order.creator.nickname}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-sams-gray-900 group-hover:text-sams-blue transition-colors truncate">
                {order.title}
              </h3>
              {order.description && (
                <p className="mt-1 text-sm text-sams-gray-500 line-clamp-2">
                  {order.description}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-sams-gray-400 group-hover:text-sams-blue shrink-0" />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-sams-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              截止 {formatDate(order.deadline)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {order.delivery_address}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {order.participant_count ?? 0} 人参与
            </span>
            {order.total_amount !== undefined && order.total_amount > 0 && (
              <span className="font-medium text-sams-blue">
                合计 {formatPrice(order.total_amount)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

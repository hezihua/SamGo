"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildPerPersonSummaryText,
  buildProcurementSummaryText,
  buildShareInviteText,
} from "@/lib/order-summary";
import type { GroupOrder, OrderItem, Profile } from "@/types/database";
import { Check, ClipboardCopy, Link2, ShoppingCart, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ItemWithProfile = OrderItem & { profile: Profile | null };

interface OrderShareActionsProps {
  order: GroupOrder;
  items: ItemWithProfile[];
  shareBaseUrl?: string;
  compact?: boolean;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function OrderShareActions({
  order,
  items,
  shareBaseUrl,
  compact = false,
}: OrderShareActionsProps) {
  const [orderUrl, setOrderUrl] = useState(shareBaseUrl ?? "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (shareBaseUrl) {
      setOrderUrl(shareBaseUrl);
      return;
    }
    setOrderUrl(`${window.location.origin}/orders/${order.id}`);
  }, [order.id, shareBaseUrl]);

  const copy = useCallback(async (key: string, text: string) => {
    await copyText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const inviteText = orderUrl
    ? buildShareInviteText(order, orderUrl)
    : "";
  const procurementText = buildProcurementSummaryText(order, items);
  const perPersonText = buildPerPersonSummaryText(order, items);

  const buttons = [
    {
      key: "invite",
      label: "复制接龙文案",
      icon: Link2,
      text: inviteText,
      variant: "default" as const,
    },
    {
      key: "procurement",
      label: "复制采购汇总",
      icon: ShoppingCart,
      text: procurementText,
      variant: "outline" as const,
    },
    {
      key: "person",
      label: "复制每人金额",
      icon: Users,
      text: perPersonText,
      variant: "outline" as const,
    },
  ];

  if (compact) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sams-gray-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          {buttons.map(({ key, label, icon: Icon, text, variant }) => (
            <Button
              key={key}
              type="button"
              variant={variant}
              size="sm"
              className="min-h-11 flex-1 text-xs"
              disabled={key === "invite" && !orderUrl}
              onClick={() => copy(key, text)}
            >
              {copiedKey === key ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" />
              )}
              {copiedKey === key ? "已复制" : label.replace("复制", "")}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">分享到微信群</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-sams-gray-600">
          复制后粘贴到群里，群友点开链接即可选品。
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {buttons.map(({ key, label, icon: Icon, text, variant }) => (
            <Button
              key={key}
              type="button"
              variant={variant}
              className="min-h-11 w-full sm:w-auto"
              disabled={key === "invite" && !orderUrl}
              onClick={() => copy(key, text)}
            >
              {copiedKey === key ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {copiedKey === key ? "已复制到剪贴板" : label}
            </Button>
          ))}
        </div>
        {orderUrl && (
          <button
            type="button"
            className="flex items-start gap-2 rounded-lg border border-sams-gray-200 bg-sams-gray-50 p-3 text-left text-xs text-sams-gray-600"
            onClick={() => copy("url", orderUrl)}
          >
            <ClipboardCopy className="mt-0.5 h-4 w-4 shrink-0 text-sams-blue" />
            <span className="break-all">{orderUrl}</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { addOrderItem } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { type Product } from "@/types/database";
import { Plus, Search } from "lucide-react";

interface AddItemFormProps {
  orderId: string;
  products: Product[];
  disabled?: boolean;
}

export function AddItemForm({ orderId, products, disabled }: AddItemFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.includes(search)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.set("group_order_id", orderId);
    formData.set(
      "product_name",
      showCustom ? customName : selectedProduct!.name
    );
    formData.set(
      "product_price",
      showCustom ? customPrice : String(selectedProduct!.price)
    );
    formData.set("quantity", String(quantity));
    formData.set("notes", notes);

    await addOrderItem(formData);
    setSelectedProduct(null);
    setQuantity(1);
    setNotes("");
    setCustomName("");
    setCustomPrice("");
    setShowCustom(false);
    setLoading(false);
  }

  if (disabled) {
    return (
      <p className="text-sm text-sams-gray-500 text-center py-4">
        拼单已截止，无法添加商品
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={!showCustom ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCustom(false)}
        >
          从商品库选择
        </Button>
        <Button
          variant={showCustom ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCustom(true)}
        >
          自定义商品
        </Button>
      </div>

      {!showCustom ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sams-gray-400" />
            <Input
              placeholder="搜索商品名称或分类..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedProduct?.id === product.id
                    ? "border-sams-blue bg-sams-blue/5"
                    : "border-sams-gray-200 hover:border-sams-blue/30"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-sams-gray-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-sams-gray-500">
                    {product.category} · {product.unit}
                  </p>
                </div>
                <span className="text-sm font-semibold text-sams-blue">
                  {formatPrice(product.price)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>商品名称</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="输入商品名称"
              className="mt-1"
            />
          </div>
          <div>
            <Label>价格 (元)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>数量</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>备注</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="如：要冰的"
              className="mt-1"
            />
          </div>
        </div>

        {selectedProduct && !showCustom && (
          <p className="text-sm text-sams-gray-600">
            小计：
            <span className="font-semibold text-sams-blue">
              {formatPrice(selectedProduct.price * quantity)}
            </span>
          </p>
        )}

        <Button
          type="submit"
          disabled={
            loading ||
            (showCustom
              ? !customName || !customPrice
              : !selectedProduct)
          }
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          {loading ? "添加中..." : "添加到拼单"}
        </Button>
      </form>
    </div>
  );
}

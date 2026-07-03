import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { createGroupOrder } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function NewOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 3);
  const deadlineStr = defaultDeadline.toISOString().slice(0, 16);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-sams-blue">发起拼单</CardTitle>
            <CardDescription>
              填写拼单信息，邀请朋友一起购买山姆好物
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createGroupOrder} className="space-y-5">
              <div>
                <Label htmlFor="title">拼单标题 *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="如：本周六山姆拼单"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">拼单说明</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="说明拼单规则、取货方式等..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="delivery_address">取货/配送地址 *</Label>
                <Input
                  id="delivery_address"
                  name="delivery_address"
                  placeholder="如：XX小区南门"
                  required
                  className="mt-1"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="deadline">截止时间 *</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="datetime-local"
                    value={deadlineStr}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="min_participants">最低参与人数</Label>
                  <Input
                    id="min_participants"
                    name="min_participants"
                    type="number"
                    min="2"
                    value="2"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">备注</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="其他需要说明的事项..."
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                创建拼单
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

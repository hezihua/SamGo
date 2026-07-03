import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: orderCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-sams-blue">个人中心</CardTitle>
            <CardDescription>管理你的账号信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-sams-blue/5 p-4 text-center">
              <p className="text-3xl font-bold text-sams-blue">{orderCount ?? 0}</p>
              <p className="text-sm text-sams-gray-500">参与的拼单数</p>
            </div>

            <form action={updateProfile} className="space-y-4">
              <div>
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  value={profile?.nickname ?? ""}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={profile?.phone ?? ""}
                  placeholder="方便联系取货"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input
                  value={user.email ?? ""}
                  disabled
                  className="mt-1 bg-sams-gray-50"
                />
              </div>
              <Button type="submit" className="w-full">
                保存修改
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

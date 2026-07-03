import Link from "next/link";
import { ShoppingCart, Plus, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sams-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sams-blue text-white font-bold text-sm">
            S
          </div>
          <div>
            <span className="text-lg font-bold text-sams-blue">SamGo</span>
            <span className="ml-1 text-xs text-sams-gray-500">山姆拼单</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/orders/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  发起拼单
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                  {profile?.nickname || "我的"}
                </Button>
              </Link>
              <form action={signOut}>
                <Button variant="outline" size="sm">退出</Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">
                <ShoppingCart className="h-4 w-4" />
                登录参与拼单
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

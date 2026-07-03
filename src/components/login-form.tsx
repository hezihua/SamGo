"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [loginState, loginAction, loginPending] = useActionState(signIn, null);
  const [registerState, registerAction, registerPending] = useActionState(
    signUp,
    null
  );

  const state = mode === "login" ? loginState : registerState;
  const pending = mode === "login" ? loginPending : registerPending;

  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-sams-blue">
          {mode === "login" ? "欢迎回来" : "加入 SamGo"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "登录后即可参与山姆拼单"
            : "注册账号，开始拼单之旅"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex rounded-lg border border-sams-gray-200 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-sams-blue text-white"
                : "text-sams-gray-600 hover:text-sams-gray-900"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-sams-blue text-white"
                : "text-sams-gray-600 hover:text-sams-gray-900"
            }`}
          >
            注册
          </button>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            {state.success}
          </div>
        )}

        <form
          action={mode === "login" ? loginAction : registerAction}
          className="space-y-4"
        >
          {mode === "register" && (
            <div>
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="你的昵称"
                required
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="至少 6 位"
              minLength={6}
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "处理中..."
              : mode === "login"
                ? "登录"
                : "注册"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-sams-gray-500">
          <Link href="/" className="text-sams-blue hover:underline">
            返回首页
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

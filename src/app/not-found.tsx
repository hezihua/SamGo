import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-sams-blue">404</h1>
      <p className="mt-4 text-lg text-sams-gray-600">页面不存在</p>
      <Link href="/" className="mt-6">
        <Button>返回首页</Button>
      </Link>
    </div>
  );
}

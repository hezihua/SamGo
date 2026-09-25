import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SamGo API",
  description: "SamGo WeChat mini program backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

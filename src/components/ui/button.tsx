import { cn } from "@/lib/utils";
import { twMerge } from "tailwind-merge";

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const variants = {
    default: "bg-sams-blue text-white hover:bg-sams-blue-dark shadow-sm",
    secondary: "bg-sams-gray-100 text-sams-gray-900 hover:bg-sams-gray-200",
    outline:
      "border border-sams-gray-300 bg-white text-sams-gray-900 hover:bg-sams-gray-50",
    ghost: "text-sams-gray-700 hover:bg-sams-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sams-blue/50 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };

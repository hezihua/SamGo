import { cn } from "@/lib/utils";

function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-sams-gray-300 bg-white px-3 py-2 text-sm text-sams-gray-900 placeholder:text-sams-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sams-blue/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

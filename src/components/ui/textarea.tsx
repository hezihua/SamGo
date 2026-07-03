import { cn } from "@/lib/utils";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-sams-gray-300 bg-white px-3 py-2 text-sm text-sams-gray-900 placeholder:text-sams-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sams-blue/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };

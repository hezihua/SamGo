import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-sams-gray-700 leading-none",
        className
      )}
      {...props}
    />
  );
}

export { Label };

import { cn } from "@/lib/utils";
import { type OrderStatus } from "@/types/database";

const statusStyles: Record<OrderStatus, string> = {
  open: "bg-green-100 text-green-800",
  closing: "bg-amber-100 text-amber-800",
  closed: "bg-sams-gray-100 text-sams-gray-700",
  completed: "bg-sams-blue/10 text-sams-blue",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | OrderStatus;
}) {
  const variants = {
    default: "bg-sams-gray-100 text-sams-gray-700",
    open: statusStyles.open,
    closing: statusStyles.closing,
    closed: statusStyles.closed,
    completed: statusStyles.completed,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

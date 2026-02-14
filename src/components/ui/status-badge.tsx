import { Badge } from "@/components/ui/badge";
import { StatusType } from "@/types";

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses = {
    success: "bg-success text-success-foreground hover:bg-success/80",
    warning: "bg-warning text-warning-foreground hover:bg-warning/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    info: "bg-info text-info-foreground hover:bg-info/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };

  return (
    <Badge className={colorClasses[status.color]}>
      {status.label}
    </Badge>
  );
}
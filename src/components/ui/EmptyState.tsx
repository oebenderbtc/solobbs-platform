import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-line bg-ink/30 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-champagne/10 text-champagne">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl text-cream">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

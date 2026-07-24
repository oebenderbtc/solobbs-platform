import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-blush">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-tight text-cream sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[15px] leading-relaxed text-mist">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

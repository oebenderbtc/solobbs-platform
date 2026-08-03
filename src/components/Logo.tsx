import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 48,
  showWordmark = true,
  wordmarkClassName,
  href = "/",
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 transition opacity-95 hover:opacity-100 sm:gap-3",
        className,
      )}
    >
      <Image
        src="/mark.svg"
        alt="SoloBBs"
        width={size}
        height={size}
        className="shrink-0 rounded-[0.75rem]"
        priority
      />
      {showWordmark && (
        <span
          className={cn(
            "truncate text-[17px] font-semibold tracking-[-0.03em] text-cream sm:text-lg",
            wordmarkClassName,
          )}
        >
          <span className="text-cream">Solo</span>
          <span className="text-blush">BBs</span>
        </span>
      )}
    </Link>
  );
}

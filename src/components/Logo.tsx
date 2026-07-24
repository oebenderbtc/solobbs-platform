import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 48,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 transition opacity-95 hover:opacity-100",
        className,
      )}
    >
      <Image
        src="/mark.svg"
        alt="SoloBBs"
        width={size}
        height={size}
        className="rounded-[0.75rem]"
        priority
      />
      {showWordmark && (
        <span
          className="font-semibold tracking-[-0.03em] text-cream"
          style={{ fontSize: Math.max(18, Math.round(size * 0.48)) }}
        >
          <span className="text-cream">Solo</span>
          <span className="text-blush">BBs</span>
        </span>
      )}
    </Link>
  );
}

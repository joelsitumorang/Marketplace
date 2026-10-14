import { Suspense } from "react";
import { countDpNeedingContact } from "@/lib/dp/queries";

interface DpBadgeProps {
  role: string;
  userBranch?: string | null;
  className?: string;
}

async function DpBadgeContent({ role, userBranch, className = "" }: DpBadgeProps) {
  try {
    const count = await countDpNeedingContact(role, userBranch);
    if (!count || count <= 0) {
      return null;
    }

    return (
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-600 text-white min-w-[18px] h-[18px] shadow-sm animate-pulse ${className}`}
        aria-label={`${count} DP perlu dihubungi`}
      >
        {count > 99 ? "99+" : count}
      </span>
    );
  } catch (err) {
    // Graceful fallback: do not crash sidebar or navigation
    return null;
  }
}

export default function DpBadge({ role, userBranch, className }: DpBadgeProps) {
  return (
    <Suspense fallback={null}>
      <DpBadgeContent role={role} userBranch={userBranch} className={className} />
    </Suspense>
  );
}

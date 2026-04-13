export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-[#00b894]/10 text-[#00b894]",
  IN_PROGRESS: "bg-[#0984e3]/10 text-[#0984e3]",
  SUBMITTED: "bg-[#fdcb6e]/10 text-[#d63031]",
  OPEN: "bg-[#6b7280]/10 text-[#6b7280]",
  DISPUTED: "bg-[#e17055]/10 text-[#e17055]",
  FAILED: "bg-[#e17055]/10 text-[#e17055]",
  CANCELLED: "bg-[#6b7280]/10 text-[#6b7280]",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

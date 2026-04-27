export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-[#00b894]/15 text-[#00b894]",
  IN_PROGRESS: "bg-[#3aa9ff]/15 text-[#3aa9ff]",
  SUBMITTED: "bg-[#fdcb6e]/15 text-[#fdcb6e]",
  OPEN: "bg-[#9ca3af]/15 text-[#9ca3af]",
  DISPUTED: "bg-[#e17055]/15 text-[#e17055]",
  FAILED: "bg-[#e17055]/15 text-[#e17055]",
  CANCELLED: "bg-[#9ca3af]/15 text-[#9ca3af]",
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

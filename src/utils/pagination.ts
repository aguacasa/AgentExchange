export function clampPagination(limit?: number, offset?: number) {
  return {
    take: Math.min(Math.max(1, limit ?? 20), 100),
    skip: Math.max(0, offset ?? 0),
  };
}

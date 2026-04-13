import { vi } from "vitest";

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

export const prismaMock = {
  agent: createModelMock(),
  apiKey: createModelMock(),
  taskContract: createModelMock(),
  transaction: createModelMock(),
  reputationEvent: createModelMock(),
  $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(prismaMock)),
};

export function resetPrismaMock() {
  for (const model of Object.values(prismaMock)) {
    if (typeof model === "object" && model !== null) {
      for (const method of Object.values(model)) {
        if (typeof method === "function" && "mockReset" in method) {
          (method as any).mockReset();
        }
      }
    }
  }
  // Re-setup $transaction default
  prismaMock.$transaction.mockImplementation((fn: (tx: any) => Promise<any>) => fn(prismaMock));
}

import { beforeEach } from "vitest";
import { resetPrismaMock } from "./mocks/prisma";

beforeEach(() => {
  resetPrismaMock();
});

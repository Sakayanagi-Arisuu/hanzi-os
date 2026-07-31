import { defineConfig } from "vitest/config";
import { DEFERRED_PRODUCTION_CONTENT_TESTS } from "./vitest.config";

export default defineConfig({
  test: {
    environment: "node",
    include: [...DEFERRED_PRODUCTION_CONTENT_TESTS],
    passWithNoTests: false,
    restoreMocks: true,
    testTimeout: 10_000,
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
      "test/**/*.test.ts",
      "test/**/*.spec.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      all: true
    } as any
  },
  resolve: {
    alias: {
      '/src': '/home/reed/Projects/Ine-Discord/src'
    }
  }
});

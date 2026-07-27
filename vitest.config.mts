import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Resolves the "@/*" paths from tsconfig.json. Vite supports this natively now, so the
  // vite-tsconfig-paths plugin the Next.js guide mentions is no longer needed.
  resolve: { tsconfigPaths: true },
  test: {
    // Everything we unit test is pure logic in lib/, so the default environment is node.
    // Add `// @vitest-environment jsdom` at the top of a test file that renders components.
    environment: "node",
  },
});

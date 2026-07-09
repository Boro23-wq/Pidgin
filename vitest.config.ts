import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  // Mirrors the "@/*" path alias in tsconfig.json. Without it, only `import
  // type` from "@/..." works under vitest (types are erased); a value import
  // fails to resolve at runtime.
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});

import type { ESLint, Linter } from "eslint";
import plugin from "./plugin.js";

export default {
  configs: {
    recommended: {
      plugins: {
        "openapi-code": plugin,
      },
      rules: {
        "openapi-code/export-convention": "error",
        "openapi-code/path-convention": "error",
        "openapi-code/prefer-ref-imports": "error",
        "openapi-code/properly-ref-and-at-imports": "error",
        "openapi-code/referable-export-default-only": "error",
      },
    } satisfies Linter.FlatConfig,
  },
} satisfies ESLint.Plugin;

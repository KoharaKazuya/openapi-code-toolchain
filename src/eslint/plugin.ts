import type { ESLint } from "eslint";
import exportConvention from "./rules/export-convention.js";
import preferRefImports from "./rules/prefer-ref-imports.js";
import pathConvention from "./rules/path-convention.js";
import properlyRefAndAtImports from "./rules/properly-ref-and-at-imports.js";
import referableExportDefaultOnly from "./rules/referable-export-default-only.js";

export default {
  rules: {
    "export-convention": exportConvention as any,
    "path-convention": pathConvention,
    "prefer-ref-imports": preferRefImports,
    "properly-ref-and-at-imports": properlyRefAndAtImports,
    "referable-export-default-only": referableExportDefaultOnly,
  },
} satisfies ESLint.Plugin;

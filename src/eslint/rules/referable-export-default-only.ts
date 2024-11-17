import type { Rule } from "eslint";
import path from "node:path";

const defFuncNames = ["define", "referable", "nameReferable"] as const;

/**
 * 定義関数の呼び出しが特定以下のファイルでの `export default` でのみ行われているかを検証する
 */
export default {
  create(context) {
    // ファイルパスから許可する定義関数の名前を取得する
    const { cwd, physicalFilename } = context;
    const relativePath = path.relative(cwd, physicalFilename);
    const allowedDefFn = defFuncName(relativePath);

    const imports: Record<string, string> = {};
    return {
      ImportDeclaration(node) {
        // 定義関数が使われているかチェックするため、Identifier を取得する
        if (node.source.value === "openapi-code/openapi/v3.1") {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.type === "Identifier" &&
              (defFuncNames as ReadonlyArray<string>).includes(
                specifier.imported.name
              )
            ) {
              imports[specifier.local.name] = specifier.imported.name;
            }
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;

        const originalName = imports[node.callee.name];

        // 定義関数でなければ無視する
        if (!originalName) return;

        // export default で規約通りの定義関数なら想定通りの呼び出し方をしているので無視する
        if (
          node.parent.type === "ExportDefaultDeclaration" &&
          originalName === allowedDefFn
        )
          return;

        // エラーにする
        context.report({
          node,
          message: `${originalName} は OpenAPI Code の規約に従って、特定パス以下のファイルの \`export default ${originalName}(…)\` の形でのみ呼び出すことができます。`,
        });
      },
    };
  },
} satisfies Rule.RuleModule;

function defFuncName(path: string): string | undefined {
  if (
    path === "src/index.ts" ||
    path.startsWith("src/paths/") ||
    path.startsWith("src/webhooks/")
  ) {
    return "define";
  } else if (path.startsWith("src/components/securitySchemes/")) {
    return "nameReferable";
  } else if (path.startsWith("src/components/")) {
    return "referable";
  }
}

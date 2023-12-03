import type { Rule } from "eslint";
import path from "node:path";

/**
 * src/components/ 以下のファイルは相対パスでインポートせず、`#/…` のような形式で参照することを推奨するルール
 */
export default {
  meta: {
    fixable: "code",
  },
  create(context) {
    const { cwd, physicalFilename } = context;

    return {
      ImportDeclaration(node) {
        // import 文の source が相対パスかつ src/components/ 以下のファイルを参照している場合のみ処理する
        const source = node.source.value;
        if (!(typeof source === "string" && source.startsWith("."))) return;
        const targetFullPath = path.resolve(
          path.dirname(physicalFilename),
          source
        );
        const target = path.relative(cwd, targetFullPath);
        if (!target.startsWith("src/components/")) return;

        // エラーを報告する
        const message = `src/components/… 以下のファイルは相対パスではなく \`#/components/…\` のような形式でインポートしてください。`;
        context.report({
          node,
          message,
          fix(fixer) {
            const fixedSource = target.replace(/^src/, "#");
            return fixer.replaceText(node.source, JSON.stringify(fixedSource));
          },
        });
      },
    };
  },
} satisfies Rule.RuleModule;

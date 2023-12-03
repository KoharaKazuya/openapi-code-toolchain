import type { Rule } from "eslint";

const openapiComponentTypes = [
  "schemas",
  "responses",
  "parameters",
  "examples",
  "requestBodies",
  "headers",
  "securitySchemes",
  "links",
  "callbacks",
  "pathItems",
] as const;

/**
 * `#/…` と `@/…` 形式のインポートを適切に使い分けることを推奨するルール
 */
export default {
  meta: {
    fixable: "code",
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        // import 文が `#/` か `@/` で始まっているかどうかを判定する
        const source = node.source.value;
        if (
          !(
            typeof source === "string" &&
            (source.startsWith("#/") || source.startsWith("@/"))
          )
        )
          return;

        // imports 文の `#/`, `@/` 以降の最初のディレクトリ名から components/ 以下を参照しているかどうかを判定する
        const pathParts = source.split("/");
        const isComponentType =
          pathParts[1] === "components" &&
          openapiComponentTypes.includes(
            pathParts[2] as (typeof openapiComponentTypes)[number]
          );

        // `#/`, `@/` の種類と参照している先の種類が一致しているかどうかを判定する
        const pass =
          (source.startsWith("#/") && isComponentType) ||
          (source.startsWith("@/") && !isComponentType);

        if (!pass) {
          // エラーを報告する
          const message = `src/components/ 以下をインポートするときは \`#/\` を、それ以外は \`@/\` から始まる形式でインポートしてください。`;
          context.report({
            node,
            message,
            fix(fixer) {
              const orig = node.source.value;
              if (typeof orig !== "string") return null;
              const fixedSource = orig.replace(
                /^./,
                isComponentType ? "#" : "@"
              );
              return fixer.replaceText(
                node.source,
                JSON.stringify(fixedSource)
              );
            },
          });
        }
      },
    };
  },
} satisfies Rule.RuleModule;

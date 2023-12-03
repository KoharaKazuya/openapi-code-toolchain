import type { Rule } from "eslint";
import path from "node:path";

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
 * 規約で定められているパス以下に不要なファイルを作れないようにするルール
 */
export default {
  create(context) {
    const { cwd, physicalFilename } = context;
    const relativePath = path.relative(cwd, physicalFilename);
    const pathParts = relativePath.split("/");

    if (relativePath.startsWith("src/paths/")) {
      // src/paths/ 以下はどんなパスでも良い
      return {};
    } else if (relativePath.startsWith("src/webhooks/")) {
      // ファイルパスの深さを判定する
      const isRightDepth = pathParts.length === 3;

      if (isRightDepth) return {};
      return {
        Program(node) {
          context.report({
            node,
            message: `Webhook のファイルは src/webhooks/ 直下に配置する必要があります。`,
          });
        },
      };
    } else if (relativePath.startsWith("src/components/")) {
      // 既知の種別かどうか判定する
      const isKnownComponentType = openapiComponentTypes.includes(
        pathParts[2] as (typeof openapiComponentTypes)[number]
      );

      // ファイルパスの深さを判定する
      const isRightDepth = pathParts.length === 4;

      if (isKnownComponentType && isRightDepth) return {};
      return {
        Program(node) {
          context.report({
            node,
            message: `src/components/ 以下のファイルのパスは \`src/components/<type>/<name>.ts\` という形式である必要があります。\`<type>\` は ${openapiComponentTypes
              .map((t) => `\`${t}\``)
              .join(", ")} のいずれかです。`,
          });
        },
      };
    } else {
      // 規約にないパスは扱わない
      return {};
    }
  },
} satisfies Rule.RuleModule;

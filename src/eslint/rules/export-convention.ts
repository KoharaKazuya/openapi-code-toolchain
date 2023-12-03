import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";

/**
 * 特定パスのファイルの export を特定の形式に統一するルール
 *
 * 1. src/index.ts は `export default define<OpenAPIV3_1.Document>(…)` を含める
 * 2. src/paths/ と src/webhooks/ 以下のファイルは `export default define<OpenAPIV3_1.PathItemObject>(…)` を含める
 * 3. src/components/<type>/ 以下のファイルは `export default referable<OpenAPIV3_1.<type>>(…)` を含める
 * 4. src/components/securitySchemes/ 以下のファイルは `export default nameReferable<OpenAPIV3_1.SecuritySchemeObject>(…)` を含める
 */
export default ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: "problem",
    schema: [],
    messages: {
      document: `src/index.ts では \`export default define<OpenAPIV3_1.Document>(…)\` を含める必要があります。`,
      pathItem: `src/paths/ または src/webhooks/ 以下のファイルでは \`export default define<OpenAPIV3_1.PathItemObject>(…)\` を含める必要があります。`,
      securityScheme: `src/components/securitySchemes/ 以下のファイルでは \`export default nameReferable<OpenAPIV3_1.SecuritySchemeObject>(…)\` を含める必要があります。`,
      component: `src/components/{{ type }}/ 以下のファイルでは \`export default referable<OpenAPIV3_1.{{ defType }}>(…)\` を含める必要があります。`,
    },
  },
  defaultOptions: [],

  create(context) {
    // ファイルパスから適用する規約を決める
    const { cwd, physicalFilename } = context;
    const relativePath = path.relative(cwd, physicalFilename!);
    const convention = createConvention(relativePath);
    if (!convention) return {};

    let foundConventionExport = false;
    return {
      ExportDefaultDeclaration(node) {
        if (convention.test(node.declaration)) foundConventionExport = true;
      },
      "Program:exit"(node) {
        if (foundConventionExport) return;
        context.report({
          node,
          messageId: convention.type,
          data: convention.data,
        });
      },
    };
  },
});

type Convention = {
  type: "document" | "pathItem" | "component" | "securityScheme";
  data?: Record<string, string>;
  test(node: TSESTree.ExportDefaultDeclaration["declaration"]): boolean;
};

const definitionTypes = {
  schemas: "SchemaObject",
  responses: "ResponseObject",
  parameters: "ParameterObject",
  examples: "ExampleObject",
  requestBodies: "RequestBodyObject",
  headers: "HeaderObject",
  securitySchemes: "SecuritySchemeObject",
  links: "LinkObject",
  callbacks: "CallbackObject",
  pathItems: "PathItemObject",
} as const;

function createConvention(path: string): Convention | undefined {
  if (path === "src/index.ts") {
    return {
      type: "document",
      test(node) {
        return (
          node.type === "CallExpression" &&
          node.callee.type === "Identifier" &&
          node.callee.name === "define" &&
          node.typeArguments?.params.length === 1 &&
          node.typeArguments.params[0].type === "TSTypeReference" &&
          node.typeArguments.params[0].typeName.type === "TSQualifiedName" &&
          node.typeArguments.params[0].typeName.left.type === "Identifier" &&
          node.typeArguments.params[0].typeName.left.name === "OpenAPIV3_1" &&
          node.typeArguments.params[0].typeName.right.type === "Identifier" &&
          node.typeArguments.params[0].typeName.right.name === "Document"
        );
      },
    };
  } else if (
    path.startsWith("src/paths/") ||
    path.startsWith("src/webhooks/")
  ) {
    return {
      type: "pathItem",
      test(node) {
        return (
          node.type === "CallExpression" &&
          node.callee.type === "Identifier" &&
          node.callee.name === "define" &&
          node.typeArguments?.params.length === 1 &&
          node.typeArguments.params[0].type === "TSTypeReference" &&
          node.typeArguments.params[0].typeName.type === "TSQualifiedName" &&
          node.typeArguments.params[0].typeName.left.type === "Identifier" &&
          node.typeArguments.params[0].typeName.left.name === "OpenAPIV3_1" &&
          node.typeArguments.params[0].typeName.right.type === "Identifier" &&
          node.typeArguments.params[0].typeName.right.name === "PathItemObject"
        );
      },
    };
  } else if (path.startsWith("src/components/securitySchemes/")) {
    return {
      type: "securityScheme",
      test(node) {
        return (
          node.type === "CallExpression" &&
          node.callee.type === "Identifier" &&
          node.callee.name === "nameReferable" &&
          node.typeArguments?.params.length === 1 &&
          node.typeArguments.params[0].type === "TSTypeReference" &&
          node.typeArguments.params[0].typeName.type === "TSQualifiedName" &&
          node.typeArguments.params[0].typeName.left.type === "Identifier" &&
          node.typeArguments.params[0].typeName.left.name === "OpenAPIV3_1" &&
          node.typeArguments.params[0].typeName.right.type === "Identifier" &&
          node.typeArguments.params[0].typeName.right.name ===
            "SecuritySchemeObject"
        );
      },
    };
  } else if (path.startsWith("src/components/")) {
    const type = path.split("/")[2];
    const defType = definitionTypes[type as keyof typeof definitionTypes];
    if (!defType) return;
    return {
      type: "component",
      data: { type, defType },
      test(node) {
        return (
          node.type === "CallExpression" &&
          node.callee.type === "Identifier" &&
          node.callee.name === "referable" &&
          node.typeArguments?.params.length === 1 &&
          node.typeArguments.params[0].type === "TSTypeReference" &&
          node.typeArguments.params[0].typeName.type === "TSQualifiedName" &&
          node.typeArguments.params[0].typeName.left.type === "Identifier" &&
          node.typeArguments.params[0].typeName.left.name === "OpenAPIV3_1" &&
          node.typeArguments.params[0].typeName.right.type === "Identifier" &&
          node.typeArguments.params[0].typeName.right.name === defType
        );
      },
    };
  } else {
    return;
  }
}

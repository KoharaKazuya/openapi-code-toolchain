import inquirer from "inquirer";
import autocomplete from "inquirer-autocomplete-standalone";
import fs from "node:fs/promises";
import path from "node:path";
import { ok } from "./terminal.js";

const kindChioces = [
  {
    name: "Path (src/paths/ 以下のファイル)",
    value: "path",
  },
  {
    name: "Webhook (src/webhooks/ 以下のファイル)",
    value: "webhook",
  },
  {
    name: "Component (src/components/ 以下のファイル)",
    value: "component",
  },
] as const;

const types = {
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

export async function generate(...args: string[]): Promise<void> {
  if (args.length > 0) {
    const query = args.join("/");
    await generateFile(query);
    return;
  }

  const kind = await autocomplete({
    message: "作成するファイルの種類を選んでください。",
    source: async (input) => {
      return kindChioces.filter((choice) =>
        choice.value.startsWith(input?.toLowerCase() ?? "")
      );
    },
  });

  let filePath;
  switch (kind) {
    case "path": {
      // 作成するファイルのパスを入力させる
      const { path: p } = await inquirer.prompt({
        type: "input",
        name: "path",
        message: "作成するファイルのパス (= URL のパス) を入力してください。",
      });
      if (!p) return;

      const normedPath = p
        .replace(/^\.\/src\/paths\//, "/")
        .replace(/\.ts$/i, "")
        .replace(/\/$/, "/index")
        .replace(/^\//, "");

      filePath = path.join("src", "paths", `${normedPath}.ts`);
      break;
    }

    case "webhook": {
      // 作成するファイルの名前を入力させる
      const { name } = await inquirer.prompt({
        type: "input",
        name: "name",
        message:
          "作成するファイルの名前 (= Webhook の名前) を入力してください。",
        validate: (input) => {
          return (
            !input ||
            /^[a-z_][a-z0-9_]*$/i.test(input) ||
            "Webhook の名前には半角英数字とアンダースコア (_) しか使えません。"
          );
        },
      });
      if (!name) return;

      filePath = path.join("src", "webhooks", `${name}.ts`);
      break;
    }

    case "component": {
      // 作成するコンポーネントの種類を入力させる
      const type = await autocomplete({
        message: "作成するコンポーネントの種類を入力してください。",
        source: async (input) => {
          return Object.entries(types)
            .map(([k, v]) => [k, v.replace(/Object$/, "")])
            .filter(([, name]) =>
              name.toLowerCase().startsWith(input?.toLowerCase() ?? "")
            )
            .map(([value, name]) => ({ value, name }));
        },
      });
      // 作成するコンポーネント名を入力させる
      const { name } = await inquirer.prompt({
        type: "input",
        name: "name",
        message: "作成するコンポーネントの名前を入力してください。",
        validate: (input) => {
          return (
            !input ||
            /^[a-z_][a-z0-9_]*$/i.test(input) ||
            "コンポーネントの名前には半角英数字とアンダースコア (_) しか使えません。"
          );
        },
      });
      if (!name) return;

      filePath = path.join("src", "components", type, `${name}.ts`);
      break;
    }

    default:
      throw new Error(`Unknown kind: ${kind satisfies never}`);
  }

  await generateFile(filePath);
}

async function generateFile(filePath: string): Promise<void> {
  const parts = filePath.split("/");

  // テンプレートからファイルの内容を作成する
  let content;
  switch (parts[1]) {
    case "paths": {
      content = pathTemplate();
      break;
    }
    case "webhooks": {
      content = webhookTemplate();
      break;
    }
    case "components": {
      const defFn =
        parts[2] === "securitySchemes" ? "nameReferable" : "referable";
      const type = types[parts[2] as keyof typeof types];
      content = componentTemplate({ defFn, type });
      break;
    }
    default:
      throw new Error(`Unknown kind: ${parts[1]}`);
  }

  // ファイルを作成する
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, { flag: "wx" });

  ok(`Successfully created ${filePath}.`);
}

function pathTemplate(): string {
  return `import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";

export default define<OpenAPIV3_1.PathItemObject>({});
`;
}

function webhookTemplate(): string {
  return pathTemplate();
}

function componentTemplate({
  defFn,
  type,
}: {
  defFn: string;
  type: string;
}): string {
  return `import { type OpenAPIV3_1, ${defFn} } from "openapi-code/openapi/v3.1";

export default ${defFn}<OpenAPIV3_1.${type}>({});
`;
}

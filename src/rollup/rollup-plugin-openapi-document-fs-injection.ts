import { generate } from "escodegen";
import type {
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  ObjectExpression,
  Program,
  Property,
} from "estree";
import path from "node:path";
import process from "node:process";
import { type Plugin } from "rollup";

const pathsRoot = "src/paths";
const webhooksRoot = "src/webhooks";
const componentsRoot = "src/components";

export default async function openAPIDocumentFSInjection(): Promise<Plugin> {
  const pathsInjections = await parsePathsFromFS();
  const webhooksInjections = await parseWebhooksFromFS();
  const componentsInjections = await parseComponentsFromFS();

  return {
    name: "openapi-document-fs-injection",
    transform(code, id) {
      const relativePath = path.relative(process.cwd(), id);

      // OpenAPI Document の場合
      if (relativePath === "src/index.ts") {
        const ast = this.parse(code) as unknown as Program;

        // `paths`, `webhooks`, `components` の import 文を挿入する
        ast.body.unshift(
          ...pathsInjections.imports,
          ...webhooksInjections.imports,
          ...componentsInjections.imports
        );

        // export を追加する
        appendExport(
          ast,
          Object.fromEntries(
            Object.entries({
              paths: pathsInjections.object,
              webhooks: webhooksInjections.object,
              components: componentsInjections.object,
            }).filter(([, value]) => value.properties.length > 0)
          )
        );

        return { code: generate(ast) };
      }
    },
  };
}

function createSimpleProperty(
  key: Property["key"],
  value: Property["value"]
): Property {
  return {
    type: "Property",
    method: false,
    shorthand: false,
    computed: false,
    key,
    value,
    kind: "init",
  };
}

function createDefaultImport(
  local: Identifier,
  source: string
): ImportDeclaration {
  return {
    type: "ImportDeclaration",
    specifiers: [{ type: "ImportDefaultSpecifier", local }],
    source: { type: "Literal", value: source },
  };
}

let n = 0;
function createUniqueIdentifier(): Identifier {
  const name = `__rollup_plugin_openapi_document_fs_injection_injected_${n++}`;
  return { type: "Identifier", name };
}

async function parsePathsFromFS(): Promise<{
  imports: ImportDeclaration[];
  object: ObjectExpression;
}> {
  const { globby } = await import("globby");
  const files = await globby([`${pathsRoot}/**/*.ts`]);

  const paths = files.map(
    (f) =>
      "/" +
      path
        .relative(pathsRoot, f)
        .replace(/\.ts$/, "")
        .replace(/index$/, "")
  );

  const imports: ImportDeclaration[] = [];
  const object: ObjectExpression = {
    type: "ObjectExpression",
    properties: [],
  };

  for (const p of paths) {
    const id = createUniqueIdentifier();
    imports.push(createDefaultImport(id, `./paths${p}`));
    object.properties.push(
      createSimpleProperty({ type: "Literal", value: p }, id)
    );
  }

  return { imports, object };
}

async function parseWebhooksFromFS(): Promise<{
  imports: ImportDeclaration[];
  object: ObjectExpression;
}> {
  const { globby } = await import("globby");
  const files = await globby([`${webhooksRoot}/*.ts`]);

  const names = files.map((f) =>
    path.relative(webhooksRoot, f).replace(/\.ts$/, "")
  );

  const imports: ImportDeclaration[] = [];
  const object: ObjectExpression = {
    type: "ObjectExpression",
    properties: [],
  };

  for (const name of names) {
    const id = createUniqueIdentifier();
    imports.push(createDefaultImport(id, `./webhooks/${name}`));
    object.properties.push(
      createSimpleProperty({ type: "Literal", value: name }, id)
    );
  }

  return { imports, object };
}

async function parseComponentsFromFS(): Promise<{
  imports: ImportDeclaration[];
  object: ObjectExpression;
}> {
  const { globby } = await import("globby");
  const files = await globby([`${componentsRoot}/*/*.ts`]);

  const paths = files.map(
    (f) => "/" + path.relative(componentsRoot, f).replace(/\.ts$/, "")
  );

  // パスが指すオブジェクト (の AST) にアクセスしやすくするため、参照を保存しておく
  const pointers = new Map<string, ObjectExpression>();
  pointers.set("", {
    type: "ObjectExpression",
    properties: [],
  });

  const imports: ImportDeclaration[] = [];
  for (const p of paths) {
    // ルートディレクトリからオブジェクト (の AST) を構築していく
    const parts = p.split("/");
    for (let len = 2; len <= parts.length; len++) {
      const parentKey = parts.slice(0, len - 1).join("/");
      const targetKey = parts.slice(0, len).join("/");

      const parent = pointers.get(parentKey)!;
      if (len === parts.length) {
        // ファイルを指している場合は import で取得したオブジェクトを追加する
        const id = createUniqueIdentifier();
        imports.push(createDefaultImport(id, `./components${targetKey}`));

        // 一つ上の要素の 1 プロパティとして追加する
        parent.properties.push(
          createSimpleProperty({ type: "Identifier", name: parts[len - 1] }, id)
        );
      } else {
        // ディレクトリを指している場合は空オブジェクトを追加する
        // すでに構築されていなければ構築する
        if (!pointers.has(targetKey)) {
          pointers.set(targetKey, { type: "ObjectExpression", properties: [] });
          parent.properties.push(
            createSimpleProperty(
              { type: "Identifier", name: parts[len - 1] },
              pointers.get(targetKey)!
            )
          );
        }
      }
    }
  }

  return {
    imports,
    object: pointers.get("")!,
  };
}

function appendExport(
  ast: Program,
  obj: Record<string, ObjectExpression>
): void {
  const dec: ExportNamedDeclaration = {
    type: "ExportNamedDeclaration",
    declaration: {
      type: "VariableDeclaration",
      kind: "const",
      declarations: [
        {
          type: "VariableDeclarator",
          id: {
            type: "Identifier",
            name: `__rollup_plugin_openapi_document_fs_injection_export`,
          },
          init: {
            type: "ObjectExpression",
            properties: Object.entries(obj).map(([key, value]) =>
              createSimpleProperty({ type: "Identifier", name: key }, value)
            ),
          },
        },
      ],
    },
    specifiers: [],
  };

  ast.body.push(dec);
}

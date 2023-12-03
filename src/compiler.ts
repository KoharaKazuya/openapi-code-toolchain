import alias, { type RollupAliasOptions } from "@rollup/plugin-alias";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { dump as dumpYaml } from "js-yaml";
import { createRequire } from "node:module";
import {
  rollup,
  watch,
  type InputOptions,
  type OutputOptions,
  type Plugin,
} from "rollup";
import esbuild from "rollup-plugin-esbuild";
import sortKeys from "sort-keys";
import "zx/globals";
import openAPIDocumentFSInjection from "./rollup/rollup-plugin-openapi-document-fs-injection.js";
import openAPIDocumentRefByImport from "./rollup/rollup-plugin-openapi-document-ref-by-import.js";
import { info, warn } from "./terminal.js";

const require = createRequire(import.meta.url);

$.verbose = false;

const buildDir = "node_modules/.cache/openapi-code/build";
const checkTemp = "node_modules/.cache/openapi-code/check-temp.yaml";

export async function compile({
  outFile = "openapi.yaml",
  mode = "build",
  check,
  onUpdate,
}: {
  buildDir?: string;
  outFile?: string;
  mode?: "build" | "watch";
  check?: boolean;
  onUpdate?: () => void;
} = {}) {
  await fs.mkdir(buildDir, { recursive: true });
  await fs.writeJSON(path.join(buildDir, "package.json"), { type: "module" });

  const inputOptions: InputOptions = {
    external: [/node_modules/],
    input: "src/index.ts",
    plugins: [
      nodeResolve(),
      (alias as unknown as (options?: RollupAliasOptions) => Plugin)({
        entries: [
          {
            find: /^(#|@)\/(.*?)(\.ts)?$/i,
            replacement: `${path.resolve(process.cwd(), "src")}/$2.ts`,
          },
        ],
      }),
      esbuild(),
      openAPIDocumentFSInjection(),
      openAPIDocumentRefByImport(),
    ],
    onwarn: (warning) => warn("Rollup warning", warning),
  };
  const outputOptions: OutputOptions = {
    dir: buildDir,
    format: "es",
  };

  const compile = async () => {
    const script = `
      import { print } from "openapi-code/compile-time";
      import { default as schema, __rollup_plugin_openapi_document_fs_injection_export as override } from "./${buildDir}/index.js";
      print(schema, override);
    `;
    const json = String(await $`node --input-type=module --eval ${script}`);
    const doc = JSON.parse(json);
    const sorted = sortKeys(doc, { deep: true });
    const yaml = dumpYaml(sorted);

    let out = check ? checkTemp : outFile;
    await fs.writeFile(out, yaml);
    await $`${require.resolve("openapi-format")} ${out} -o ${out}`;

    if (check)
      await $`diff -u ${outFile} ${checkTemp}`.catch((err) => {
        throw new Error(
          `Found difference between ${outFile} and source code.\n\n${err}`
        );
      });
  };

  switch (mode) {
    case "build": {
      const bundle = await rollup(inputOptions);
      await bundle.write(outputOptions);
      await bundle.close();
      await compile();
      onUpdate?.();
      break;
    }

    case "watch": {
      const watcher = watch({
        ...inputOptions,
        output: [outputOptions],
        watch: {},
      });

      watcher.on("event", (event) => {
        switch (event.code) {
          case "BUNDLE_END": {
            compile()
              .then(() => {
                info("Successfully compiled.");
                onUpdate?.();
              })
              .catch((err) => {
                warn("Failed to compile.", err);
              });
            break;
          }

          case "ERROR": {
            warn("Failed to compile.", event.error);
            break;
          }
        }
      });

      await watcher.close();
      break;
    }

    default:
      throw new Error(`Unknown compile mode: ${mode satisfies never}`);
  }
}

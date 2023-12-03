import type { Plugin } from "rollup";

const refMarker = "?openapi-document-ref-by-import";
const nameMarker = "?openapi-document-name-by-import";

export default function openAPIDocumentRefByImport(): Plugin {
  return {
    name: "openapi-document-ref-by-import",
    async resolveId(source, importer, options) {
      // `#/components/schemas/Example` のように `#/` から始まっているもののみ対象とする
      if (!source.startsWith("#/")) return null;

      const resolution = await this.resolve(source, importer, options);
      if (!resolution) return null;

      // Security Scheme Object は NameReferable なので文字列に変換する
      if (source.startsWith("#/components/securitySchemes/")) {
        const name = source.split("/").slice(-1)[0];
        return `${resolution.id}${nameMarker}=${name}`;
      }

      // マーカーを付与する
      return `${resolution.id}${refMarker}=${source}`;
    },
    load(id) {
      if (id.includes(refMarker)) {
        const index = id.indexOf(refMarker);
        const $ref = id.substring(index + refMarker.length + 1);
        return { code: `export default ${JSON.stringify({ $ref })};\n` };
      } else if (id.includes(nameMarker)) {
        const index = id.indexOf(nameMarker);
        const name = id.substring(index + nameMarker.length + 1);
        return { code: `export default ${JSON.stringify(name)};\n` };
      }

      return null;
    },
  };
}

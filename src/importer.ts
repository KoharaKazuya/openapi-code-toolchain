import { load as loadYaml } from "js-yaml";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { OpenAPIV3_1 } from "./openapi/v3.1/types.js";

export async function importDocument(target: string): Promise<void> {
  // src/ ディレクトリを作成する
  await fs.mkdir(path.join(process.cwd(), "src")).catch((err) => {
    // src/ ディレクトリが存在する場合はエラーにする
    if (err.code !== "EEXIST") throw err;
    throw new Error(
      `すでに src/ ディレクトリが存在します。import したい場合は既存の src/ を削除してください。`,
      { cause: err }
    );
  });

  // target を読み込み、パースする
  const content = await fs.readFile(target, { encoding: "utf-8" });
  const document = loadYaml(content, { json: true });
  const output = parseDocument(document as any);

  for (const [p, code] of Object.entries(output)) {
    const filePath = path.join(process.cwd(), p);
    // ディレクトリを作成する
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    // ファイルを書き込む
    await fs.writeFile(filePath, code);
  }
}

type OutputFiles = Record<string, string>;

function parseDocument(document: OpenAPIV3_1.Document): OutputFiles {
  const { paths, webhooks, components, ...rest } = document;

  const { imports, code: object } = Document(rest);
  const code = `
    import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";
    ${printImports(imports)}

    export default define<OpenAPIV3_1.Document>(${object});
  `;

  return {
    "src/index.ts": code,
    ...parsePaths(paths as any),
    ...parseWebhooks(webhooks as any),
    ...parseComponents(components as any),
  };
}

function parsePaths(
  paths: Record<string, OpenAPIV3_1.PathItemObject> = {}
): OutputFiles {
  return Object.fromEntries(
    Object.entries(paths).map(([key, value]) => {
      const p = key.replace(/\/$/, "/index").replace(/^\//, "");

      const { imports, code: object } = PathItem(value);
      const code = `
        import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";
        ${printImports(imports)}

        export default define<OpenAPIV3_1.PathItemObject>(${object});
      `;

      return [`src/paths/${p}.ts`, code];
    })
  );
}

function parseWebhooks(
  webhooks: Record<string, OpenAPIV3_1.PathItemObject> = {}
): OutputFiles {
  return Object.fromEntries(
    Object.entries(webhooks).map(([key, value]) => {
      const { imports, code: object } = PathItem(value);
      const code = `
        import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";
        ${printImports(imports)}

        export default define<OpenAPIV3_1.PathItemObject>(${object});
      `;

      return [`src/webhooks/${key}.ts`, code];
    })
  );
}

function parseComponents(
  components: Record<string, OpenAPIV3_1.ComponentsObject> = {}
): OutputFiles {
  return Object.fromEntries(
    Object.entries(components).flatMap(([type, map]) =>
      Object.entries(map).map(([key, value]) => {
        let code;
        if (type === "securitySchemes") {
          const { imports, code: object } = SecurityScheme(value as any);
          code = `
            import { type OpenAPIV3_1, nameReferable } from "openapi-code/openapi/v3.1";
            ${printImports(imports)}

            export default nameReferable<OpenAPIV3_1.SecuritySchemeObject>(${object});
          `;
        } else {
          const { imports, code: object } = converters[
            type as keyof typeof converters
          ](value as any);
          code = `
            import { type OpenAPIV3_1, referable } from "openapi-code/openapi/v3.1";
            ${printImports(imports)}

            export default referable<OpenAPIV3_1.${
              types[type as keyof typeof types]
            }>(${object});
          `;
        }

        return [`src/components/${type}/${key}.ts`, code];
      })
    )
  );
}

function printImports(imports: string[]): string {
  return Array.from(new Set(imports)).join("\n");
}

type OutputProgram = {
  imports: string[];
  code: string;
};

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

const converters = {
  schemas: Schema,
  responses: Response,
  parameters: Parameter,
  examples: Example,
  requestBodies: RequestBody,
  headers: Header,
  securitySchemes: SecurityScheme,
  links: Link,
  callbacks: Callback,
  pathItems: PathItem,
} as const;

function Document(document: OpenAPIV3_1.Document): OutputProgram {
  return convertObject(document, {
    info: Info,
    servers: (servers) => convertArray(servers, Server),
    security: (security) => convertArray(security, SecurityRequirement),
    tags: (tags) => convertArray(tags, Tag),
    externalDocs: ExternalDocumentation,
  });
}

function Info(info: OpenAPIV3_1.InfoObject): OutputProgram {
  return convertObject(info, {
    contact: Contact,
    license: License,
  });
}

function Contact(contact: OpenAPIV3_1.ContactObject): OutputProgram {
  return { imports: [], code: codify(contact) };
}

function License(license: OpenAPIV3_1.LicenseObject): OutputProgram {
  return { imports: [], code: codify(license) };
}

function Server(server: OpenAPIV3_1.ServerObject): OutputProgram {
  return convertObject(server, {
    variables: (variables) => convertRecord(variables, ServerVariable),
  });
}

function ServerVariable(
  serverVariable: OpenAPIV3_1.ServerVariableObject
): OutputProgram {
  return { imports: [], code: codify(serverVariable) };
}

function Paths(paths: OpenAPIV3_1.PathsObject): OutputProgram {
  return convertRecord(paths, PathItem);
}

function PathItem(pathItem: OpenAPIV3_1.PathItemObject): OutputProgram {
  return convertObject(pathItem, {
    servers: (servers) => convertArray(servers, Server),
    parameters: (parameters) =>
      convertArray(parameters, OrReference(Parameter)),
    ...httpMethodsConverter(Operation),
  });
}

function Operation(operation: OpenAPIV3_1.OperationObject): OutputProgram {
  return convertObject(operation, {
    externalDocs: ExternalDocumentation,
    parameters: (parameters) =>
      convertArray(parameters, OrReference(Parameter)),
    requestBody: OrReference(RequestBody),
    responses: Responses,
    callbacks: (callbacks) => convertRecord(callbacks, OrReference(Callback)),
    security: (security) => convertArray(security, SecurityRequirement),
    servers: (servers) => convertArray(servers, Server),
  });
}

function ExternalDocumentation(
  externalDocumentation: OpenAPIV3_1.ExternalDocumentationObject
): OutputProgram {
  return { imports: [], code: codify(externalDocumentation) };
}

function Parameter(parameter: OpenAPIV3_1.ParameterObject): OutputProgram {
  return ParameterBase(parameter);
}

function Header(header: OpenAPIV3_1.HeaderObject): OutputProgram {
  return ParameterBase(header);
}

function ParameterBase(
  parameterBase: OpenAPIV3_1.ParameterBaseObject
): OutputProgram {
  return convertObject(parameterBase, {
    schema: OrReference(Schema),
    examples: (examples) => convertRecord(examples, OrReference(Example)),
    content: (content) => convertRecord(content, MediaType),
  });
}

function Schema(schema: OpenAPIV3_1.SchemaObject): OutputProgram {
  return convertObject(schema, {
    items: OrReference(Schema),
    properties: (properties) => convertRecord(properties, OrReference(Schema)),
    additionalProperties: OrReference(Schema),
    not: OrReference(Schema),
    allOf: (allOf) => convertArray(allOf, OrReference(Schema)),
    oneOf: (oneOf) => convertArray(oneOf, OrReference(Schema)),
    anyOf: (anyOf) => convertArray(anyOf, OrReference(Schema)),
    discriminator: Discriminator,
    xml: XML,
    externalDocs: ExternalDocumentation,
    examples: (examples) => convertArray(examples, Example),
  });
}

function Discriminator(
  discriminator: OpenAPIV3_1.DiscriminatorObject
): OutputProgram {
  return { imports: [], code: codify(discriminator) };
}

function XML(xml: OpenAPIV3_1.XMLObject): OutputProgram {
  return { imports: [], code: codify(xml) };
}

function Reference(reference: OpenAPIV3_1.ReferenceObject): OutputProgram {
  const name = reference.$ref.split("/").slice(-1)[0];
  const dec = `import ${name} from ${codify(reference.$ref)};`;
  return { imports: [dec], code: name };
}

function Example(example: OpenAPIV3_1.ExampleObject): OutputProgram {
  return { imports: [], code: codify(example) };
}

function MediaType(mediaType: OpenAPIV3_1.MediaTypeObject): OutputProgram {
  return convertObject(mediaType, {
    schema: OrReference(Schema),
    examples: (examples) => convertRecord(examples, OrReference(Example)),
    encoding: (encoding) => convertRecord(encoding, Encoding),
  });
}

function Encoding(encoding: OpenAPIV3_1.EncodingObject): OutputProgram {
  return convertObject(encoding, {
    headers: (headers) => convertRecord(headers, OrReference(Header)),
  });
}

function RequestBody(
  requestBody: OpenAPIV3_1.RequestBodyObject
): OutputProgram {
  return convertObject(requestBody, {
    content: (content) => convertRecord(content, MediaType),
  });
}

function Responses(responses: OpenAPIV3_1.ResponsesObject): OutputProgram {
  return convertRecord(responses, OrReference(Response));
}

function Response(response: OpenAPIV3_1.ResponseObject): OutputProgram {
  return convertObject(response, {
    headers: (headers) => convertRecord(headers, OrReference(Header)),
    content: (content) => convertRecord(content, MediaType),
    links: (links) => convertRecord(links, OrReference(Link)),
  });
}

function Link(link: OpenAPIV3_1.LinkObject): OutputProgram {
  return convertObject(link, {
    server: Server,
  });
}

function Callback(callback: OpenAPIV3_1.CallbackObject): OutputProgram {
  return convertRecord(callback, OrReference(PathItem));
}

function SecurityRequirement(
  securityRequirement: OpenAPIV3_1.SecurityRequirementObject
): OutputProgram {
  const imports = [];
  const codes = [];

  for (const [name, scopes] of Object.entries(securityRequirement)) {
    imports.push(`import ${name} from "#/components/securitySchemes/${name}";`);
    codes.push(`[${name}]: ${codify(scopes)}`);
  }

  return { imports, code: `{\n${codes.join(",\n")}\n}` };
}

function Components(components: OpenAPIV3_1.ComponentsObject): OutputProgram {
  return convertObject(components, {
    schemas: (schemas) => convertRecord(schemas, Schema),
    responses: (responses) => convertRecord(responses, OrReference(Response)),
    parameters: (parameters) =>
      convertRecord(parameters, OrReference(Parameter)),
    examples: (examples) => convertRecord(examples, OrReference(Example)),
    requestBodies: (requestBodies) =>
      convertRecord(requestBodies, OrReference(RequestBody)),
    headers: (headers) => convertRecord(headers, OrReference(Header)),
    securitySchemes: (securitySchemes) =>
      convertRecord(securitySchemes, OrReference(SecurityScheme)),
    links: (links) => convertRecord(links, OrReference(Link)),
    callbacks: (callbacks) => convertRecord(callbacks, OrReference(Callback)),
    pathItems: (pathItems) => convertRecord(pathItems, OrReference(PathItem)),
  });
}

function SecurityScheme(
  securityScheme: OpenAPIV3_1.SecuritySchemeObject
): OutputProgram {
  return { imports: [], code: codify(securityScheme) };
}

function Tag(tag: OpenAPIV3_1.TagObject): OutputProgram {
  return convertObject(tag, {
    externalDocs: ExternalDocumentation,
  });
}

function OrReference<T extends object>(
  converter: (x: T) => OutputProgram
): (x: T | OpenAPIV3_1.ReferenceObject) => OutputProgram {
  return (x) => ("$ref" in x ? Reference(x) : converter(x));
}

type ObjectOnly<T> = T extends object ? T : never;

function convertObject<T extends object>(
  obj: T,
  converters: { [K in keyof T]?: (x: ObjectOnly<T[K]>) => OutputProgram }
): OutputProgram {
  const imports = [];
  const codes = [];

  for (const [key, value] of Object.entries(obj)) {
    const converter = converters[key as keyof T];
    if (converter && typeof value === "object" && value !== null) {
      const { imports: i, code: c } = converter(value);
      imports.push(...i);
      codes.push([key, c]);
    } else {
      codes.push([key, codify(value)]);
    }
  }

  const code = `{\n${codes
    .map(([k, v]) => `${codify(k)}: ${v}`)
    .join(",\n")}\n}`;

  return { imports, code };
}

function convertRecord<T>(
  obj: Record<string, T>,
  converter: (x: ObjectOnly<T>) => OutputProgram
): OutputProgram {
  const imports = [];
  const codes = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      const { imports: i, code: c } = converter(value as any);
      imports.push(...i);
      codes.push([key, c]);
    } else {
      codes.push([key, codify(value)]);
    }
  }

  const code = `{\n${codes
    .map(([k, v]) => `${codify(k)}: ${v}`)
    .join(",\n")}\n}`;

  return { imports, code };
}

function convertArray<T>(
  arr: T[],
  converter: (item: ObjectOnly<T>) => OutputProgram
): OutputProgram {
  const imports = [];
  const codes = [];

  for (const value of arr) {
    if (typeof value === "object" && value !== null) {
      const { imports: i, code: c } = converter(value as any);
      imports.push(...i);
      codes.push(c);
    } else {
      codes.push(codify(value));
    }
  }

  const code = `[\n${codes.join(",\n")}\n]`;

  return { imports, code };
}

function httpMethodsConverter<T>(
  converter: (x: T) => OutputProgram
): Record<OpenAPIV3_1.HttpMethods, (x: T) => OutputProgram> {
  return {
    get: converter,
    put: converter,
    post: converter,
    delete: converter,
    options: converter,
    head: converter,
    patch: converter,
    trace: converter,
  };
}

function codify(x: unknown): string {
  return JSON.stringify(x);
}

import type {
  OpenAPIV3_1,
  TypedReferenceObject,
} from "./openapi/v3.1/types.js";

export function print(schema: object, override: object): string {
  const obj = Document({ ...schema, ...override } as any);
  return JSON.stringify(obj);
}

function Document(document: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  return convertObject(
    document as OpenAPIV3_1.Document &
      Record<"paths" | "webhooks" | "components", any>,
    {
      info: Info,
      servers: (servers: OpenAPIV3_1.ServerObject[]) =>
        convertArray(servers, Server),
      paths: Paths,
      webhooks: (
        webhooks: Record<
          string,
          OpenAPIV3_1.PathItemObject | OpenAPIV3_1.ReferenceObject
        >
      ) => convertRecord(webhooks, OrReference(PathItem)),
      components: Components,
      security: (security) => convertArray(security, SecurityRequirement),
      tags: (tags) => convertArray(tags, Tag),
      externalDocs: ExternalDocumentation,
    }
  );
}

function Info(info: OpenAPIV3_1.InfoObject): OpenAPIV3_1.InfoObject {
  return convertObject(info, {
    contact: Contact,
    license: License,
  });
}

function Contact(
  contact: OpenAPIV3_1.ContactObject
): OpenAPIV3_1.ContactObject {
  return contact;
}

function License(
  license: OpenAPIV3_1.LicenseObject
): OpenAPIV3_1.LicenseObject {
  return license;
}

function Server(server: OpenAPIV3_1.ServerObject): OpenAPIV3_1.ServerObject {
  return convertObject(server, {
    variables: (variables) => convertRecord(variables, ServerVariable),
  });
}

function ServerVariable(
  serverVariable: OpenAPIV3_1.ServerVariableObject
): OpenAPIV3_1.ServerVariableObject {
  return serverVariable;
}

function Paths(paths: OpenAPIV3_1.PathsObject): OpenAPIV3_1.PathsObject {
  return convertRecord(paths, PathItem);
}

function PathItem(
  pathItem: OpenAPIV3_1.PathItemObject
): OpenAPIV3_1.PathItemObject {
  return convertObject(pathItem, {
    servers: (servers) => convertArray(servers, Server),
    parameters: (parameters) =>
      convertArray(parameters, OrReference(Parameter)),
    ...httpMethodsConverter(Operation),
  });
}

function Operation(
  operation: OpenAPIV3_1.OperationObject
): OpenAPIV3_1.OperationObject {
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
): OpenAPIV3_1.ExternalDocumentationObject {
  return externalDocumentation;
}

function Parameter(
  parameter: OpenAPIV3_1.ParameterObject
): OpenAPIV3_1.ParameterObject {
  return ParameterBase(parameter);
}

function Header(header: OpenAPIV3_1.HeaderObject): OpenAPIV3_1.HeaderObject {
  return ParameterBase(header);
}

function ParameterBase<T extends OpenAPIV3_1.ParameterBaseObject>(
  parameterBase: T
): T {
  const { optional, ...rest } = parameterBase;
  const req = optional ? {} : { required: true };
  return convertObject({ ...rest, ...req } as any, {
    schema: OrReference(Schema),
    examples: (examples) => convertRecord(examples, OrReference(Example)),
    content: (content) => convertRecord(content, MediaType),
  });
}

function Schema(schema: OpenAPIV3_1.SchemaObject): OpenAPIV3_1.SchemaObject {
  const { optional = [], ...rest } = schema;
  const keys = Object.keys(rest.properties || {});
  const required = keys.filter((key) => !optional.includes(key));
  const req = required && required.length > 0 ? { required } : {};
  return convertObject({ ...rest, ...req } as any, {
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
): OpenAPIV3_1.DiscriminatorObject {
  return discriminator;
}

function XML(xml: OpenAPIV3_1.XMLObject): OpenAPIV3_1.XMLObject {
  return xml;
}

function Reference(
  reference: OpenAPIV3_1.ReferenceObject
): OpenAPIV3_1.ReferenceObject {
  return reference;
}

function Example(
  example: OpenAPIV3_1.ExampleObject
): OpenAPIV3_1.ExampleObject {
  return example;
}

function MediaType(
  mediaType: OpenAPIV3_1.MediaTypeObject
): OpenAPIV3_1.MediaTypeObject {
  return convertObject(mediaType, {
    schema: OrReference(Schema),
    examples: (examples) => convertRecord(examples, OrReference(Example)),
    encoding: (encoding) => convertRecord(encoding, Encoding),
  });
}

function Encoding(
  encoding: OpenAPIV3_1.EncodingObject
): OpenAPIV3_1.EncodingObject {
  return convertObject(encoding, {
    headers: (headers) => convertRecord(headers, OrReference(Header)),
  });
}

function RequestBody(
  requestBody: OpenAPIV3_1.RequestBodyObject
): OpenAPIV3_1.RequestBodyObject {
  const { optional, ...rest } = requestBody;
  const req = optional ? {} : { required: true };
  return convertObject({ ...rest, ...req } as any, {
    content: (content) => convertRecord(content, MediaType),
  });
}

function Responses(
  responses: OpenAPIV3_1.ResponsesObject
): OpenAPIV3_1.ResponsesObject {
  return convertRecord(responses, OrReference(Response));
}

function Response(
  response: OpenAPIV3_1.ResponseObject
): OpenAPIV3_1.ResponseObject {
  return convertObject(response, {
    headers: (headers) => convertRecord(headers, OrReference(Header)),
    content: (content) => convertRecord(content, MediaType),
    links: (links) => convertRecord(links, OrReference(Link)),
  });
}

function Link(link: OpenAPIV3_1.LinkObject): OpenAPIV3_1.LinkObject {
  return convertObject(link, {
    server: Server,
  });
}

function Callback(
  callback: OpenAPIV3_1.CallbackObject
): OpenAPIV3_1.CallbackObject {
  return convertRecord(callback, OrReference(PathItem));
}

function SecurityRequirement(
  securityRequirement: OpenAPIV3_1.SecurityRequirementObject
): OpenAPIV3_1.SecurityRequirementObject {
  return securityRequirement;
}

function Components(
  components: OpenAPIV3_1.ComponentsObject
): OpenAPIV3_1.ComponentsObject {
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
): OpenAPIV3_1.SecuritySchemeObject {
  return securityScheme;
}

function Tag(tag: OpenAPIV3_1.TagObject): OpenAPIV3_1.TagObject {
  return convertObject(tag, {
    externalDocs: ExternalDocumentation,
  });
}

function OrReference<T extends object>(
  converter: (x: T) => T
): (x: T | TypedReferenceObject<T>) => T | TypedReferenceObject<T> {
  return (x) => ("$ref" in x ? Reference(x) : converter(x)) as any;
}

type ObjectOnly<T> = T extends object ? T : never;

function convertObject<T extends object>(
  obj: T,
  converters: { [K in keyof T]?: (x: ObjectOnly<T[K]>) => ObjectOnly<T[K]> }
): T {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const converter = converters[key as keyof T];
      if (converter && typeof value === "object" && value !== null) {
        return [key, converter(value as any)];
      }
      return [key, value];
    })
  ) as T;
}

function convertRecord<T>(
  obj: Record<string, T>,
  converter: (x: ObjectOnly<T>) => ObjectOnly<T>
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === "object" && value !== null
        ? converter(value as any)
        : value,
    ])
  );
}

function convertArray<T>(
  arr: T[],
  converter: (item: ObjectOnly<T>) => ObjectOnly<T>
): T[] {
  return arr.map((item) =>
    typeof item === "object" && item !== null ? converter(item as any) : item
  );
}

function httpMethodsConverter<T>(
  converter: (x: T) => T
): Record<OpenAPIV3_1.HttpMethods, (x: T) => T> {
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

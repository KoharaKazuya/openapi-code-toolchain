import { type OpenAPIV3_1, referable } from "openapi-code/openapi/v3.1";

export default referable<OpenAPIV3_1.SchemaObject>({
  type: "object",
  properties: {
    id: {
      type: "integer",
      format: "int64",
    },
    name: {
      type: "string",
    },
    tag: {
      type: "string",
    },
  },
  required: ["id", "name"],
});

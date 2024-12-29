import { type OpenAPIV3_1, referable } from "openapi-code/openapi/v3.1";

export default referable<OpenAPIV3_1.SchemaObject>({
  type: "object",
  properties: {
    code: {
      type: "integer",
      format: "int32",
    },
    message: {
      type: "string",
    },
  },
  required: ["code", "message"],
});

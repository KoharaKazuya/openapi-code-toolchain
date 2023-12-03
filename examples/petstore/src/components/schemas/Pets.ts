import { type OpenAPIV3_1, referable } from "openapi-code/openapi/v3.1";
import Pet from "#/components/schemas/Pet";

export default referable<OpenAPIV3_1.SchemaObject>({
  type: "array",
  maxItems: 100,
  items: Pet,
});

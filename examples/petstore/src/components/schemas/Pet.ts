import { type TypiaSchema, referable } from "openapi-code/openapi/v3.1";
import typia, { type tags } from "typia";

type Pet = {
  id: number & tags.JsonSchemaPlugin<{ type: "integer"; format: "int64" }>;
  name: string;
  tag?: string;
};

export default referable<TypiaSchema>(
  typia.json.schemas<[Pet], "3.1">().components.schemas!.Pet
);

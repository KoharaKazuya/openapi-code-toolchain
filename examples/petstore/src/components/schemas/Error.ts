import { type TypiaSchema, referable } from "openapi-code/openapi/v3.1";
import typia, { type tags } from "typia";

type Error = {
  code: number & tags.JsonSchemaPlugin<{ type: "integer"; format: "int32" }>;
  message: string;
};

export default referable<TypiaSchema>(
  typia.json.schemas<[Error], "3.1">().components.schemas!.Error,
);

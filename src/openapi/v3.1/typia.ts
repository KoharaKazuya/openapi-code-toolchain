import type { IJsonSchemaCollection } from "typia";

export type TypiaSchema = NonNullable<
  IJsonSchemaCollection<"3.1">["components"]["schemas"]
>[string];

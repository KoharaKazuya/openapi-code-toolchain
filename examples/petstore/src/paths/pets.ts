import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";
import Error from "#/components/schemas/Error";
import Pets from "#/components/schemas/Pets";

export default define<OpenAPIV3_1.PathItemObject>({
  get: {
    summary: "List all pets",
    operationId: "listPets",
    tags: ["pets"],
    parameters: [
      {
        name: "limit",
        in: "query",
        description: "How many items to return at one time (max 100)",
        optional: true,
        schema: {
          type: "integer",
          maximum: 100,
          format: "int32",
        },
      },
    ],
    responses: {
      "200": {
        description: "A paged array of pets",
        headers: {
          "x-next": {
            description: "A link to the next page of responses",
            optional: true,
            schema: {
              type: "string",
            },
          },
        },
        content: {
          "application/json": {
            schema: Pets,
          },
        },
      },
      default: {
        description: "unexpected error",
        content: {
          "application/json": {
            schema: Error,
          },
        },
      },
    },
  },

  post: {
    summary: "Create a pet",
    operationId: "createPets",
    tags: ["pets"],
    responses: {
      "201": {
        description: "Null response",
      },
      default: {
        description: "unexpected error",
        content: {
          "application/json": {
            schema: Error,
          },
        },
      },
    },
  },
});

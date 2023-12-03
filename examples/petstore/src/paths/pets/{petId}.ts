import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";
import Error from "#/components/schemas/Error";
import Pet from "#/components/schemas/Pet";

export default define<OpenAPIV3_1.PathItemObject>({
  get: {
    summary: "Info for a specific pet",
    operationId: "showPetById",
    tags: ["pets"],
    parameters: [
      {
        name: "petId",
        in: "path",
        description: "The id of the pet to retrieve",
        schema: {
          type: "string",
        },
      },
    ],
    responses: {
      "200": {
        description: "Expected response to a valid request",
        content: {
          "application/json": {
            schema: Pet,
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
});

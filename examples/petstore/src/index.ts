import { type OpenAPIV3_1, define } from "openapi-code/openapi/v3.1";

export default define<OpenAPIV3_1.Document>({
  openapi: "3.1.0",

  info: {
    version: "1.0.0",
    title: "Swagger Petstore",
    license: { name: "MIT" },
  },

  servers: [{ url: "http://petstore.swagger.io/v1" }],
});

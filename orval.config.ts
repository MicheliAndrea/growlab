import { defineConfig } from "orval";

export default defineConfig({
  growlab: {
    input: {
      target: "./openapi/growlab.openapi.yaml",
    },
    output: {
      target: "./packages/openapi-client/src/generated/client.ts",
      schemas: "./packages/openapi-client/src/generated/model",
      client: "fetch",
      mode: "split",
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: "./packages/openapi-client/src/runtime/fetcher.ts",
          name: "growlabFetch",
        },
      },
    },
  },
});

import { defineConfig } from 'orval'

export default defineConfig({
  'inventory-service': {
    input: {
      target: './openapi/inventory-service.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/services/api/generated/inventory-service/index.ts',
      schemas: 'src/services/api/generated/inventory-service/model',
      client: 'axios-functions',
      override: {
        mutator: {
          path: './src/services/http/axios-instance.ts',
          name: 'apiRequest',
        },
      },
    },
  },
})

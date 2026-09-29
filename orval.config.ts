import { defineConfig } from 'orval'

const services = [
  {
    name: 'movie-service',
    openApiUrl: 'http://localhost:8081/v3/api-docs',
  },
  {
    name: 'user-service',
    openApiUrl: 'http://localhost:8082/v3/api-docs',
  },
  {
    name: 'inventory-service',
    openApiUrl: 'http://localhost:8083/v3/api-docs',
  },
  {
    name: 'booking-service',
    openApiUrl: 'http://localhost:8084/v3/api-docs',
  },
  {
    name: 'payment-service',
    openApiUrl: 'http://localhost:8085/v3/api-docs',
  },
] as const

export default defineConfig(
  Object.fromEntries(
    services.map(({ name, openApiUrl }) => [
      name,
      {
        input: {
          target: openApiUrl,
        },
        output: {
          mode: 'tags-split',
          target: `src/services/api/generated/${name}/index.ts`,
          schemas: `src/services/api/generated/${name}/model`,
          client: 'axios-functions',
          override: {
            mutator: {
              path: './src/services/http/axios-instance.ts',
              name: 'apiRequest',
            },
          },
        },
      },
    ]),
  ),
)

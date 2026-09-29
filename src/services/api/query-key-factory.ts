export function createQueryKeyFactory<const TScope extends string>(scope: TScope) {
  return {
    all: [scope] as const,

    lists: () => [scope, 'list'] as const,

    list: <TFilters extends Record<string, unknown>>(filters: TFilters) =>
      [scope, 'list', filters] as const,

    details: () => [scope, 'detail'] as const,

    detail: (id: string) => [scope, 'detail', id] as const,
  }
}

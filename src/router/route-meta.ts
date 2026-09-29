import 'vue-router'
import type { AppPermission, AppRole } from '../config/authorization'

export type LayoutName = 'customer' | 'auth' | 'admin'

declare module 'vue-router' {
  interface RouteMeta {
    layout: LayoutName
    title: string
    requiresAuth?: boolean
    roles?: AppRole[]
    permissions?: AppPermission[]
    anyPermissions?: AppPermission[]
  }
}

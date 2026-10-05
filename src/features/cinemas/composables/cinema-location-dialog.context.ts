import { inject, provide, type InjectionKey, type Ref } from 'vue'

interface CinemaLocationDialogContext {
  isOpen: Readonly<Ref<boolean>>
  open: (trigger: HTMLButtonElement) => void
}

const cinemaLocationDialogKey: InjectionKey<CinemaLocationDialogContext> =
  Symbol('cinema-location-dialog')

export function provideCinemaLocationDialog(context: CinemaLocationDialogContext) {
  provide(cinemaLocationDialogKey, context)
}

export function useCinemaLocationDialog() {
  const context = inject(cinemaLocationDialogKey)

  if (!context) {
    throw new Error('useCinemaLocationDialog requires a provider in CustomerLayout.')
  }

  return context
}
